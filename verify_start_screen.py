from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:8080/index.html")

        # Wait for the main elements to load
        page.wait_for_selector("#screen-home")

        # Take a screenshot of the start screen
        page.screenshot(path="start_screen.png")
        print("Screenshot saved to start_screen.png")

        browser.close()

if __name__ == "__main__":
    run()
