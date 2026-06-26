import webview
import sys
import os
from backend.api import FocusApi

def main():
    # 1. Instantiate the API bridge
    api = FocusApi()

    # 2. Determine what to load (Dev vs Prod)
    # For now, we will just load a basic HTML string to test the Python window.
    # Later, we will point this to http://localhost:5173 (React Vite server).
    dev_html = """
    <html>
        <body style="font-family: sans-serif; padding: 2rem; background: #121212; color: white;">
            <h1>Focus Mode Backend Running \U0001F680</h1>
            <p>pywebview is successfully hosting the Python API.</p>
            <p>Waiting for React frontend to be initialized...</p>
        </body>
    </html>
    """

    # 3. Create the window
    window = webview.create_window(
        title='Focus Mode',
        html=dev_html,
        js_api=api,          # This injects FocusApi into window.pywebview.api
        width=900,
        height=700,
        resizable=True
    )

    # 4. Start the application
    # debug=True allows you to open Chromium DevTools by right-clicking the window
    webview.start(debug=True)

if __name__ == '__main__':
    main()