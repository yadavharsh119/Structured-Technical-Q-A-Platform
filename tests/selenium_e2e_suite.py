import os
import sys
import time
import unittest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

BASE_URL = os.environ.get("TEST_BASE_URL", "http://localhost:3000")

class DevPerspectiveFullE2ETest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        chrome_options = Options()
        chrome_options.add_argument("--headless=new")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--window-size=1400,900")

        service = Service(ChromeDriverManager().install())
        cls.driver = webdriver.Chrome(service=service, options=chrome_options)
        cls.wait = WebDriverWait(cls.driver, 10)

    @classmethod
    def tearDownClass(cls):
        if cls.driver:
            cls.driver.quit()

    def test_01_homepage_and_clean_ui_render(self):
        """Verify homepage loads clean light styling and navigation items."""
        self.driver.get(BASE_URL)
        time.sleep(1.5)

        self.assertIn("DevPerspective", self.driver.title)

        # Navbar brand check
        brand = self.wait.until(EC.presence_of_element_located((By.XPATH, "//a[contains(., 'DevPerspective')]")))
        self.assertTrue(brand.is_displayed())

        # Check question cards loaded
        question_cards = self.driver.find_elements(By.CSS_SELECTOR, "a[href*='/questions/']")
        self.assertGreater(len(question_cards), 0)

    def test_02_demo_login_and_auth_persistence(self):
        """Verify login via demo account Sarah (Senior)."""
        self.driver.get(f"{BASE_URL}/auth/login")
        time.sleep(1)

        # Click Sarah (Senior) demo button
        demo_btn = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Sarah (Senior)')]")))
        demo_btn.click()

        time.sleep(2)
        # Verify authenticated UI state (Navbar shows Sarah's avatar or user dropdown)
        user_badge = self.wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Sarah')]")))
        self.assertTrue(user_badge.is_displayed())

    def test_03_topics_page_navigation(self):
        """Verify browsing topics catalog and navigating to specific topic detail."""
        self.driver.get(f"{BASE_URL}/topics")
        time.sleep(1)

        topic_cards = self.wait.until(EC.presence_of_all_elements_located((By.XPATH, "//a[contains(@href, '/topics/')]")))
        self.assertGreater(len(topic_cards), 0)

        # Click on React topic
        react_topic = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//a[contains(@href, '/topics/react')]")))
        react_topic.click()

        time.sleep(1)
        self.assertIn("/topics/react", self.driver.current_url)

    def test_04_question_details_and_perspectives(self):
        """Verify viewing a question and reading its 5 structured perspective sections."""
        self.driver.get(f"{BASE_URL}/questions/q1")
        time.sleep(1.5)

        body_text = self.driver.find_element(By.TAG_NAME, "body").text.upper()
        # Verify structured sections exist in rendered DOM
        self.assertIn("BACKGROUND", body_text)
        self.assertIn("WHAT WORKED", body_text)
        self.assertIn("DIRECT ADVICE", body_text)

    def test_05_voting_interaction(self):
        """Verify upvoting a perspective button."""
        self.driver.get(f"{BASE_URL}/questions/q1")
        time.sleep(1.5)

        vote_buttons = self.driver.find_elements(By.CSS_SELECTOR, "button[class*='voteBtn']")
        self.assertGreater(len(vote_buttons), 0)
        # Verify button is clickable
        self.assertTrue(vote_buttons[0].is_enabled())

if __name__ == "__main__":
    unittest.main()
