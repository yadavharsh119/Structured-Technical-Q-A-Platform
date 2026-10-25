#!/usr/bin/env python3
"""Selenium happy path for the Structured Q&A Platform.

Creates three throwaway users (authors A and B, moderator M), exercises
registration, question review, topic creation, perspectives, upvotes and
comparison, and cleans every created row up in a finally block.

All elements are located by data-testid only. Waits are explicit; there are
no fixed sleeps. Run with --headed to watch the browser.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

import psycopg2
from selenium import webdriver
from selenium.common.exceptions import (
    NoSuchElementException,
    StaleElementReferenceException,
    TimeoutException,
)
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"
WAIT_SECONDS = 25
PASSWORD = "E2eHappy!Pass2026"
CATEGORY_NAME = "Debugging"
TAG_NAME = "redis"
OWN_VOTE_TOOLTIP = "You can't vote on your own Perspective"

RUN_ID = str(time.time_ns())
EMAIL_PREFIX = f"e2e.{RUN_ID}"
EMAIL_PATTERN = f"{EMAIL_PREFIX}.%@example.com"
USERNAME_PATTERN = f"e2e_{RUN_ID}_%"

USERS = [
    {
        "key": "A",
        "full_name": "E2E Author A",
        "username": f"e2e_{RUN_ID}_a",
        "email": f"{EMAIL_PREFIX}.a@example.com",
    },
    {
        "key": "B",
        "full_name": "E2E Author B",
        "username": f"e2e_{RUN_ID}_b",
        "email": f"{EMAIL_PREFIX}.b@example.com",
    },
    {
        "key": "M",
        "full_name": "E2E Moderator M",
        "username": f"e2e_{RUN_ID}_m",
        "email": f"{EMAIL_PREFIX}.m@example.com",
    },
]
USER_BY_KEY = {user["key"]: user for user in USERS}

QUESTION_TITLE = f"E2E question {RUN_ID}"
QUESTION_DESCRIPTION = (
    f"What is the safest cache-aside strategy for a read-heavy service? "
    f"Created by the Selenium happy path ({RUN_ID})."
)
TOPIC_URL: str | None = None
QUESTION_URL: str | None = None


def log(message: str) -> None:
    print(message, flush=True)


def read_dotenv(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :]
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
            value = value[1:-1]
        values[key] = value
    return values


ENV_DEFAULTS = read_dotenv(ROOT / ".env")
BASE_URL = (
    os.environ.get("BASE_URL")
    or ENV_DEFAULTS.get("CLIENT_URL")
    or "http://localhost:3000"
).rstrip("/")
DATABASE_URL = os.environ.get("DATABASE_URL") or ENV_DEFAULTS.get("DATABASE_URL")


def url(path: str) -> str:
    return f"{BASE_URL}{path}"


def testid(name: str) -> tuple[str, str]:
    return (By.CSS_SELECTOR, f'[data-testid="{name}"]')


def wait(driver: webdriver.Chrome, seconds: int = WAIT_SECONDS) -> WebDriverWait:
    return WebDriverWait(driver, seconds)


def wait_visible(driver: webdriver.Chrome, name: str):
    return wait(driver).until(EC.visibility_of_element_located(testid(name)))


def wait_clickable(driver: webdriver.Chrome, name: str):
    return wait(driver).until(EC.element_to_be_clickable(testid(name)))


def scroll_to(driver: webdriver.Chrome, element) -> None:
    # The client sets scroll-behavior: smooth globally; instant avoids clicking
    # while the page is still animating.
    driver.execute_script(
        "arguments[0].scrollIntoView({block: 'center', inline: 'nearest', behavior: 'instant'});",
        element,
    )


def click(driver: webdriver.Chrome, name: str) -> None:
    element = wait_clickable(driver, name)
    scroll_to(driver, element)
    element.click()


def fill(driver: webdriver.Chrome, name: str, value: str) -> None:
    element = wait_visible(driver, name)
    element.clear()
    element.send_keys(value)


def fill_first_visible(driver: webdriver.Chrome, name: str, value: str) -> None:
    def find_visible(d):
        for candidate in d.find_elements(*testid(name)):
            if candidate.is_displayed():
                return candidate
        return False

    element = wait(driver).until(find_visible)
    scroll_to(driver, element)
    element.clear()
    element.send_keys(value)


def find_item_now(driver: webdriver.Chrome, name: str, text: str):
    for candidate in driver.find_elements(*testid(name)):
        try:
            if text in candidate.text:
                return candidate
        except StaleElementReferenceException:
            continue
    return None


def wait_item_containing(driver: webdriver.Chrome, name: str, text: str):
    return wait(driver).until(
        lambda d: find_item_now(d, name, text),
        message=f"No {name} containing {text!r}",
    )


def wait_item_gone(driver: webdriver.Chrome, name: str, text: str) -> None:
    wait(driver).until(
        lambda d: find_item_now(d, name, text) is None,
        message=f"{name} containing {text!r} is still visible",
    )


def child(element, name: str):
    return element.find_element(*testid(name))


def wait_path(driver: webdriver.Chrome, path: str) -> None:
    wait(driver).until(
        lambda d: urlparse(d.current_url).path == path,
        message=f"Expected path {path}, got {urlparse(driver.current_url).path}",
    )


def wait_text(driver: webdriver.Chrome, name: str, expected: str) -> None:
    wait(driver).until(
        lambda d: d.find_element(*testid(name)).text.strip() == expected,
        message=f"{name} did not become {expected!r}",
    )


def wait_success_or_error(
    driver: webdriver.Chrome, success_name: str, error_name: str, action: str
):
    def check(d):
        success = [element for element in d.find_elements(*testid(success_name)) if element.is_displayed()]
        if success:
            return success[0]
        errors = [element for element in d.find_elements(*testid(error_name)) if element.is_displayed()]
        if errors:
            message = errors[0].text.strip() or f"{error_name} is displayed"
            raise AssertionError(f"{action} failed: {message}")
        return False

    return wait(driver).until(check)


def register_user(driver: webdriver.Chrome, user: dict[str, str]) -> None:
    driver.get(url("/register"))
    fill(driver, "input-register-fullName", user["full_name"])
    fill(driver, "input-register-username", user["username"])
    fill(driver, "input-register-email", user["email"])
    fill(driver, "input-register-password", PASSWORD)
    fill(driver, "input-register-confirmPassword", PASSWORD)
    click(driver, "button-register")
    success = wait_success_or_error(
        driver, "register-success", "error-register", f"Registration of @{user['username']}"
    )
    if "Check your email" not in success.text:
        raise AssertionError(f"Unexpected registration result: {success.text!r}")


def login(driver: webdriver.Chrome, user: dict[str, str]) -> None:
    driver.get(url("/login"))
    fill(driver, "input-login-identifier", user["email"])
    fill(driver, "input-login-password", PASSWORD)
    click(driver, "button-login")
    wait_success_or_error(driver, "nav-username", "error-login", f"Login as @{user['username']}")
    wait_text(driver, "nav-username", f"@{user['username']}")


def logout(driver: webdriver.Chrome) -> None:
    click(driver, "nav-logout")
    wait_visible(driver, "nav-login")
    wait(driver).until(
        lambda d: not d.find_elements(*testid("nav-username")),
        message="Navbar still shows a username after logout",
    )


def submit_perspective(
    driver: webdriver.Chrome,
    username: str,
    solution: str,
    explanation: str,
    advantage: str,
    limitation: str,
) -> None:
    click(driver, "submit-perspective-button")
    wait_visible(driver, "perspective-solution-input")
    fill(driver, "perspective-solution-input", solution)
    fill(driver, "perspective-explanation-input", explanation)
    fill_first_visible(driver, "perspective-advantage-input", advantage)
    fill_first_visible(driver, "perspective-limitation-input", limitation)
    click(driver, "perspective-submit-button")

    success = wait_visible(driver, "perspective-success")
    if "Perspective submitted" not in success.text:
        raise AssertionError(f"Unexpected perspective result: {success.text!r}")

    item = wait_item_containing(driver, "perspective-item", f"@{username}")
    if solution not in item.text:
        raise AssertionError("The submitted perspective text is not visible in the list")


def upvote_button_for(driver: webdriver.Chrome, username: str):
    item = find_item_now(driver, "perspective-item", f"@{username}")
    if item is None:
        return None
    try:
        return child(item, "perspective-upvote-button")
    except NoSuchElementException:
        return None


def wait_upvote_enabled(driver: webdriver.Chrome, username: str) -> None:
    wait(driver).until(
        lambda d: (button := upvote_button_for(d, username)) is not None and button.is_enabled(),
        message=f"Upvote button for @{username} did not become enabled",
    )


def wait_upvote_count(driver: webdriver.Chrome, username: str, expected: int) -> None:
    def count_matches(d):
        item = find_item_now(d, "perspective-item", f"@{username}")
        if item is None:
            return False
        try:
            return child(item, "perspective-upvote-count").text.strip() == str(expected)
        except (NoSuchElementException, StaleElementReferenceException):
            return False

    wait(driver).until(
        count_matches,
        message=f"Upvote count for @{username} did not become {expected}",
    )


def toggle_upvote(driver: webdriver.Chrome, username: str, expected: int) -> None:
    wait_upvote_enabled(driver, username)
    button = upvote_button_for(driver, username)
    scroll_to(driver, button)
    button.click()
    wait_upvote_count(driver, username, expected)


def select_compare_checkbox(driver: webdriver.Chrome, username: str) -> None:
    item = wait_item_containing(driver, "perspective-item", f"@{username}")
    checkbox = child(item, "perspective-compare-checkbox")
    scroll_to(driver, checkbox)
    checkbox.click()

    def is_selected(d):
        current = find_item_now(d, "perspective-item", f"@{username}")
        if current is None:
            return False
        try:
            return child(current, "perspective-compare-checkbox").is_selected()
        except (NoSuchElementException, StaleElementReferenceException):
            return False

    wait(driver).until(is_selected, message=f"Compare checkbox for @{username} was not selected")


def open_db():
    if not DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL is not set and no DATABASE_URL entry was found in the repo .env"
        )
    connection = psycopg2.connect(DATABASE_URL, connect_timeout=10)
    connection.autocommit = False
    return connection


def verify_and_promote_users(connection) -> None:
    emails = [user["email"] for user in USERS]
    moderator_email = USER_BY_KEY["M"]["email"]

    with connection.cursor() as cursor:
        cursor.execute(
            "UPDATE users SET email_verified_at = now() WHERE email::text = ANY(%s)",
            (emails,),
        )
        if cursor.rowcount != len(USERS):
            raise AssertionError(
                f"Expected to verify {len(USERS)} users, updated {cursor.rowcount}"
            )

        cursor.execute(
            "UPDATE users SET role = 'moderator' WHERE email::text = %s",
            (moderator_email,),
        )
        if cursor.rowcount != 1:
            raise AssertionError("Moderator account was not promoted")

        cursor.execute(
            "SELECT email::text, role::text, email_verified_at IS NOT NULL "
            "FROM users WHERE email::text = ANY(%s)",
            (emails,),
        )
        rows = cursor.fetchall()

    connection.commit()

    if len(rows) != len(USERS):
        raise AssertionError(f"Expected {len(USERS)} users in the database, found {len(rows)}")
    if not all(verified for _, _, verified in rows):
        raise AssertionError("Not every test user is email-verified")
    if sum(1 for _, role, _ in rows if role == "moderator") != 1:
        raise AssertionError("Expected exactly one moderator")


def cleanup(connection) -> int:
    """Delete this run's users and all content they created, newest first."""
    user_ids = "SELECT id FROM users WHERE email::text LIKE %s"
    topic_ids = f"SELECT id FROM topics WHERE created_by IN ({user_ids})"
    question_ids = f"SELECT id FROM questions WHERE author_id IN ({user_ids})"
    perspective_ids = f"SELECT id FROM perspectives WHERE author_id IN ({user_ids})"

    statements: list[tuple[str, str, tuple[str, ...]]] = [
        (
            "perspective_votes (voters)",
            f"DELETE FROM perspective_votes WHERE user_id IN ({user_ids})",
            (EMAIL_PATTERN,),
        ),
        (
            "perspective_votes (test perspectives)",
            f"DELETE FROM perspective_votes WHERE perspective_id IN ({perspective_ids})",
            (EMAIL_PATTERN,),
        ),
        (
            "perspective_deletion_requests",
            "DELETE FROM perspective_deletion_requests "
            f"WHERE requested_by IN ({user_ids}) OR reviewed_by IN ({user_ids}) "
            f"OR perspective_id IN ({perspective_ids})",
            (EMAIL_PATTERN, EMAIL_PATTERN, EMAIL_PATTERN),
        ),
        (
            "reports",
            "DELETE FROM reports "
            f"WHERE reporter_id IN ({user_ids}) OR handled_by IN ({user_ids})",
            (EMAIL_PATTERN, EMAIL_PATTERN),
        ),
        (
            "attachments",
            f"DELETE FROM attachments WHERE uploader_id IN ({user_ids})",
            (EMAIL_PATTERN,),
        ),
        (
            "perspectives",
            f"DELETE FROM perspectives WHERE author_id IN ({user_ids})",
            (EMAIL_PATTERN,),
        ),
        (
            "topic_questions",
            "DELETE FROM topic_questions "
            f"WHERE question_id IN ({question_ids}) OR topic_id IN ({topic_ids})",
            (EMAIL_PATTERN, EMAIL_PATTERN),
        ),
        (
            "question_tags",
            f"DELETE FROM question_tags WHERE question_id IN ({question_ids})",
            (EMAIL_PATTERN,),
        ),
        (
            "questions",
            f"DELETE FROM questions WHERE author_id IN ({user_ids})",
            (EMAIL_PATTERN,),
        ),
        (
            "topic_slug_redirects",
            f"DELETE FROM topic_slug_redirects WHERE topic_id IN ({topic_ids})",
            (EMAIL_PATTERN,),
        ),
        (
            "topic_tags",
            f"DELETE FROM topic_tags WHERE topic_id IN ({topic_ids})",
            (EMAIL_PATTERN,),
        ),
        (
            "topics",
            f"DELETE FROM topics WHERE created_by IN ({user_ids})",
            (EMAIL_PATTERN,),
        ),
        (
            "user_actions",
            "DELETE FROM user_actions "
            f"WHERE user_id IN ({user_ids}) OR admin_id IN ({user_ids})",
            (EMAIL_PATTERN, EMAIL_PATTERN),
        ),
        (
            "expert_fingerprints",
            f"DELETE FROM expert_fingerprints WHERE user_id IN ({user_ids})",
            (EMAIL_PATTERN,),
        ),
        (
            "sessions",
            f"DELETE FROM sessions WHERE user_id IN ({user_ids})",
            (EMAIL_PATTERN,),
        ),
        (
            "email_verification_tokens",
            f"DELETE FROM email_verification_tokens WHERE user_id IN ({user_ids})",
            (EMAIL_PATTERN,),
        ),
        (
            "password_reset_tokens",
            f"DELETE FROM password_reset_tokens WHERE user_id IN ({user_ids})",
            (EMAIL_PATTERN,),
        ),
        (
            "oauth_identities",
            f"DELETE FROM oauth_identities WHERE user_id IN ({user_ids})",
            (EMAIL_PATTERN,),
        ),
        (
            "login_attempts",
            "DELETE FROM login_attempts WHERE identifier LIKE %s OR identifier LIKE %s",
            (EMAIL_PATTERN, USERNAME_PATTERN),
        ),
        (
            "users",
            "DELETE FROM users WHERE email::text LIKE %s",
            (EMAIL_PATTERN,),
        ),
    ]

    removed: dict[str, int] = {}
    with connection.cursor() as cursor:
        for label, statement, params in statements:
            cursor.execute(statement, params)
            if cursor.rowcount > 0:
                removed[label] = cursor.rowcount
        cursor.execute(
            "SELECT count(*) FROM users WHERE email::text LIKE %s",
            (EMAIL_PATTERN,),
        )
        remaining_users = cursor.fetchone()[0]

    connection.commit()

    if remaining_users:
        raise AssertionError(f"{remaining_users} test users survived cleanup")

    return removed.get("users", 0)


# ---------------------------------------------------------------------------
# Flow steps
# ---------------------------------------------------------------------------


def step_create_users() -> str:
    return ", ".join(f"{user['key']}=@{user['username']}" for user in USERS)


def step_register(driver: webdriver.Chrome) -> str:
    for user in USERS:
        register_user(driver, user)
    return f"registered {', '.join('@' + user['username'] for user in USERS)}"


def step_verify_and_promote(connection) -> str:
    verify_and_promote_users(connection)
    return f"verified A/B/M and promoted @{USER_BY_KEY['M']['username']}"


def step_login_a(driver: webdriver.Chrome) -> str:
    login(driver, USER_BY_KEY["A"])
    return f"navbar shows @{USER_BY_KEY['A']['username']}"


def step_ask_question(driver: webdriver.Chrome) -> str:
    global QUESTION_URL

    driver.get(url("/questions/new"))
    wait_visible(driver, "question-title-input")

    def taxonomy_ready(d):
        element = d.find_element(*testid("question-category-select"))
        return element.is_enabled() and len(Select(element).options) > 1

    wait(driver).until(taxonomy_ready, message="Category options did not load")
    category_select = driver.find_element(*testid("question-category-select"))
    Select(category_select).select_by_visible_text(CATEGORY_NAME)

    click(driver, f"question-tag-{TAG_NAME}")
    wait_visible(driver, f"question-tag-remove-{TAG_NAME}")

    fill(driver, "question-title-input", QUESTION_TITLE)
    fill(driver, "question-description-input", QUESTION_DESCRIPTION)
    click(driver, "question-submit-button")

    success = wait_visible(driver, "question-submit-success")
    if "Submitted for review" not in success.text:
        raise AssertionError(f"Unexpected question result: {success.text!r}")

    click(driver, "nav-my-questions")
    wait_path(driver, "/questions/mine")
    item = wait_item_containing(driver, "my-question-item", QUESTION_TITLE)
    badge = child(item, "question-status-badge")
    if badge.text.strip() != "Pending":
        raise AssertionError(f"Expected Pending status, got {badge.text!r}")

    QUESTION_URL = driver.current_url
    return "question created and listed as Pending"


def step_approve_question(driver: webdriver.Chrome) -> str:
    logout(driver)
    login(driver, USER_BY_KEY["M"])

    wait_visible(driver, "nav-review")
    click(driver, "nav-review")
    wait_path(driver, "/admin/questions")

    item = wait_item_containing(driver, "review-item", QUESTION_TITLE)
    scroll_to(driver, item)
    item.click()

    click(driver, "review-approve-create-button")
    modal_title = wait_visible(driver, "review-create-topic-title-input")
    if modal_title.get_attribute("value") != QUESTION_TITLE:
        raise AssertionError("Create-topic modal was not prefilled with the question title")
    modal_tags = driver.find_element(*testid("review-create-topic-tags-input"))
    if TAG_NAME not in (modal_tags.get_attribute("value") or ""):
        raise AssertionError("Create-topic modal was not prefilled with the question tags")

    click(driver, "review-create-topic-submit-button")
    success = wait_visible(driver, "review-success")
    if QUESTION_TITLE not in success.text:
        raise AssertionError(f"Approval message did not mention the question: {success.text!r}")
    wait_item_gone(driver, "review-item", QUESTION_TITLE)
    return "question approved and removed from the review queue"


def step_open_topic(driver: webdriver.Chrome) -> str:
    global TOPIC_URL

    driver.get(url("/topics"))
    card = wait_item_containing(driver, "topic-card", QUESTION_TITLE)
    scroll_to(driver, card)
    card.click()

    wait(driver).until(
        lambda d: re.fullmatch(r"/topics/[^/]+", urlparse(d.current_url).path) is not None,
        message="Topic page URL did not open",
    )
    wait_visible(driver, "submit-perspective-button")
    TOPIC_URL = driver.current_url
    return TOPIC_URL


def step_a_perspective(driver: webdriver.Chrome) -> str:
    if TOPIC_URL is None:
        raise AssertionError("Topic URL is missing")

    logout(driver)
    login(driver, USER_BY_KEY["A"])
    driver.get(TOPIC_URL)
    wait_visible(driver, "submit-perspective-button")

    submit_perspective(
        driver,
        USER_BY_KEY["A"]["username"],
        "Use cache-aside with TTL jitter and a single-flight lock.",
        "Reads populate the cache on a miss; jitter spreads expirations and the "
        "single-flight lock stops a stampede from hammering the database.",
        "Keeps hot reads fast without stale data living forever.",
        "Adds one extra dependency and a cold-cache latency spike.",
    )
    return f"perspective by @{USER_BY_KEY['A']['username']} is listed"


def step_b_perspective(driver: webdriver.Chrome) -> str:
    if TOPIC_URL is None:
        raise AssertionError("Topic URL is missing")

    logout(driver)
    login(driver, USER_BY_KEY["B"])
    driver.get(TOPIC_URL)
    wait_visible(driver, "submit-perspective-button")

    submit_perspective(
        driver,
        USER_BY_KEY["B"]["username"],
        "Serve reads from a read-through cache backed by read replicas.",
        "The cache layer loads values on demand and falls back to a read replica, "
        "so the primary only handles writes.",
        "Scales read traffic horizontally and keeps the primary focused on writes.",
        "Replica lag can surface stale values unless the cache TTL is tuned.",
    )

    wait_item_containing(driver, "perspective-item", f"@{USER_BY_KEY['A']['username']}")
    return f"perspective by @{USER_BY_KEY['B']['username']} is listed"


def step_upvotes(driver: webdriver.Chrome) -> str:
    b_username = USER_BY_KEY["B"]["username"]
    a_username = USER_BY_KEY["A"]["username"]

    b_item = wait_item_containing(driver, "perspective-item", f"@{b_username}")
    b_button = child(b_item, "perspective-upvote-button")
    if b_button.is_enabled():
        raise AssertionError("B can upvote their own perspective")
    if b_button.get_attribute("title") != OWN_VOTE_TOOLTIP:
        raise AssertionError("Own-perspective upvote button has the wrong tooltip")

    logout(driver)
    login(driver, USER_BY_KEY["A"])
    if TOPIC_URL is None:
        raise AssertionError("Topic URL is missing")
    driver.get(TOPIC_URL)
    wait_item_containing(driver, "perspective-item", f"@{b_username}")
    wait_upvote_count(driver, b_username, 0)

    toggle_upvote(driver, b_username, 1)
    toggle_upvote(driver, b_username, 0)
    toggle_upvote(driver, b_username, 1)

    return "own-vote disabled; A toggled B's vote 0 -> 1 -> 0 -> 1"


def step_compare(driver: webdriver.Chrome) -> str:
    a_username = USER_BY_KEY["A"]["username"]
    b_username = USER_BY_KEY["B"]["username"]

    select_compare_checkbox(driver, a_username)
    select_compare_checkbox(driver, b_username)

    wait(driver).until(
        lambda d: d.find_element(*testid("compare-selected-button")).tag_name.lower() == "a",
        message="Compare selected did not become an active link",
    )
    click(driver, "compare-selected-button")
    wait_path(driver, "/compare")
    wait_visible(driver, "compare-view")
    wait(driver).until(
        lambda d: len(d.find_elements(*testid("compare-column"))) == 2,
        message="Compare view does not have two columns",
    )

    columns = driver.find_elements(*testid("compare-column"))
    column_text = "\n".join(column.text for column in columns)
    if f"@{a_username}" not in column_text or f"@{b_username}" not in column_text:
        raise AssertionError("Compare view does not show both authors")

    return "compare view shows 2 columns with both authors"


def build_driver(headed: bool) -> webdriver.Chrome:
    options = webdriver.ChromeOptions()
    if not headed:
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1440,1200")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-first-run")
    options.add_argument("--no-default-browser-check")
    driver = webdriver.Chrome(options=options)
    driver.set_window_size(1440, 1200)
    driver.set_page_load_timeout(45)
    return driver


def capture_screenshot(driver: webdriver.Chrome, index: int, name: str) -> Path | None:
    try:
        ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:50]
        filename = f"failure-{time.strftime('%Y%m%d-%H%M%S')}-{index:02d}-{slug}.png"
        path = ARTIFACTS_DIR / filename
        if driver.save_screenshot(str(path)):
            return path
    except Exception as exc:  # noqa: BLE001 - screenshot must never mask the failure
        log(f"WARN  Could not save a failure screenshot: {exc}")
    return None


def database_label(database_url: str | None) -> str:
    if not database_url:
        return "<unset>"
    parsed = urlparse(database_url)
    host = parsed.hostname or "unknown-host"
    port = f":{parsed.port}" if parsed.port else ""
    database = parsed.path.lstrip("/") or "unknown-db"
    return f"{host}{port}/{database}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Selenium happy path for Structured Q&A")
    parser.add_argument(
        "--headed",
        action="store_true",
        help="Run Chrome with a visible window instead of headless mode",
    )
    args = parser.parse_args()

    log(f"E2E run {RUN_ID}")
    log(f"Base URL: {BASE_URL}")
    log(f"Database: {database_label(DATABASE_URL)}")

    driver: webdriver.Chrome | None = None
    connection = None
    failure: Exception | None = None
    cleanup_failed = False

    try:
        connection = open_db()
        driver = build_driver(args.headed)

        steps: list[tuple[str, object]] = [
            ("Create unique users A, B and M", step_create_users),
            ("Register A, B and M through /register", lambda: step_register(driver)),
            ("Verify all users and promote M in the database", lambda: step_verify_and_promote(connection)),
            ("Log in as A and check the navbar username", lambda: step_login_a(driver)),
            ("A asks a question and sees it Pending in My Questions", lambda: step_ask_question(driver)),
            ("M approves A's question with Create Topic", lambda: step_approve_question(driver)),
            ("Open the new topic card from /topics", lambda: step_open_topic(driver)),
            ("A submits a perspective and sees it listed", lambda: step_a_perspective(driver)),
            ("B submits a perspective and sees it listed", lambda: step_b_perspective(driver)),
            ("B cannot self-upvote; A toggles B's upvote", lambda: step_upvotes(driver)),
            ("A compares both perspectives", lambda: step_compare(driver)),
        ]

        for index, (name, action) in enumerate(steps, start=1):
            try:
                detail = action()
            except Exception as exc:  # noqa: BLE001 - first failure stops the run
                failure = exc
                screenshot = capture_screenshot(driver, index, name)
                log(f"FAIL  {index}. {name}: {exc}")
                if screenshot is not None:
                    log(f"      Screenshot: {screenshot}")
                break
            log(f"PASS  {index}. {name}" + (f" - {detail}" if detail else ""))
    except Exception as exc:  # noqa: BLE001 - setup failure
        failure = exc
        log(f"FAIL  setup: {exc}")
    finally:
        if driver is not None:
            try:
                driver.quit()
            except Exception:  # noqa: BLE001 - best-effort browser shutdown
                pass

        if connection is not None:
            try:
                connection.rollback()
                removed_users = cleanup(connection)
                log(
                    f"PASS  cleanup: removed {removed_users} test user(s) "
                    "and all their content (audit_logs left intact)"
                )
            except Exception as exc:  # noqa: BLE001 - cleanup failure is reported
                cleanup_failed = True
                log(f"FAIL  cleanup: {exc}")
                try:
                    connection.rollback()
                except Exception:  # noqa: BLE001
                    pass
            finally:
                connection.close()

    if failure is not None or cleanup_failed:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
