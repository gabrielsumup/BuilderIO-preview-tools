function injectSymbolButtons() {
    console.log("🔍 Content injector running...");
    const symbolElements = document.querySelectorAll('[data-builder-component="symbol"]');
    console.log(`📍 Found ${symbolElements.length} symbols`);

    symbolElements.forEach((element) => {
        const contentId = element.getAttribute('data-builder-content-id');

        if (!contentId) return;

        const button = document.createElement('button');
        button.textContent = '⚡ Edit';
        button.style.cssText = `
            position: absolute;
            top: 0;
            right: 0;
            padding: 4px 8px;
            background: #ff6b6b;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            z-index: 9999;
        `;

        if (getComputedStyle(element).position === 'static') {
            element.style.position = 'relative';
        }

        button.addEventListener('click', (e) => {
            e.stopPropagation();
            chrome.tabs.create({ url: `https://builder.io/content/${contentId}` });
        });

        element.appendChild(button);
        console.log(`✅ Added button to symbol: ${contentId}`);
    });
}

// Run on page load
console.log("📂 Content script loaded");

// Add highlight styles
const style = document.createElement('style');
style.textContent = `
    .symbol-highlighted {
        border: 3px solid red !important;
        outline: 3px solid red !important;
    }
`;
document.head.appendChild(style);

injectSymbolButtons();

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrollToSymbol") {
        console.log(`🎯 Scrolling to symbol: ${request.contentId}`);

        // Remove highlight from previously highlighted element
        const previouslyHighlighted = document.querySelector('.symbol-highlighted');
        if (previouslyHighlighted) {
            previouslyHighlighted.classList.remove('symbol-highlighted');
        }

        const symbolElement = document.querySelector(
            `[data-builder-component="symbol"][data-builder-content-id="${request.contentId}"]`
        );

        if (symbolElement) {
            // Add highlight
            symbolElement.classList.add('symbol-highlighted');

            // Scroll to it
            symbolElement.scrollIntoView({ behavior: "smooth", block: "center" });
            console.log(`✅ Scrolled and highlighted symbol`);
            sendResponse({ success: true });
        } else {
            console.log(`❌ Symbol not found`);
            sendResponse({ success: false });
        }
    }
});