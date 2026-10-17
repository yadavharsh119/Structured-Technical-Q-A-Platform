
from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait

driver = webdriver.Chrome()

try:
    driver.get("http://localhost:3000")

    WebDriverWait(driver, 15).until(
        lambda d: d.execute_script(
            "return document.readyState"
        ) == "complete"
    )

    print("Page title:", driver.title)
    print("Current URL:", driver.current_url)

    assert driver.current_url.startswith(
        "http://localhost:3000"
    )

    print("TEST PASSED: Website opened successfully.")

finally:
    driver.quit()
