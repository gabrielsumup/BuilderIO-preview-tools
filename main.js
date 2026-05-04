console.log("main.js loaded");

//DOM elements
const localeDropdwon = document.querySelector("#localeDropDown")
const urlParamDropDown = document.querySelector("#urlParamDropDown")
const localeSubmitButton = document.querySelector("#localeSubmitButton")
const localeSwitch = document.querySelector("#localeSwitch")
// const searchButton = document.getElementById("searchButton")
const openButton = document.getElementById("openButton")
const detectSymbolsButton = document.getElementById("detectSymbolsButton")
const neonButton = document.getElementById("neonButton")
const urlParamSubmitButton = document.getElementById("urlParamSubmitButton")
const urlParamSwitch = document.querySelector("#urlParamSwitch")

//URLS
if (typeof chrome !== 'undefined' && chrome.tabs) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]?.url) {
            console.log("No valid tab URL found");
            return;
        }

        const currentURL = tabs[0].url;
        console.log("Current tab URL: ", currentURL);

        const locale = getLocaleFromUrl(currentURL);
        console.log("Current locale: ", locale);
    });
} else {
    console.warn("Chrome extension API not available");
}

function getLocaleFromUrl(url) {
    try {
        const pathname = new URL(url).pathname;
        const segments = pathname.split('/').filter(Boolean);

        if (segments.length > 0) {
            console.log(segments[0])
            return segments[0];
        }
    } catch (error) {
        console.error("Invalid URL:", url, error);
    }

    return null;
}


//URL params
urlParamDropDown.addEventListener("change", (e) => {
    console.log("select")
    selectedParam = e.target.value
    console.log("param selected: ", selectedParam)
})

urlParamSwitch.addEventListener("submit", () => {
    event.preventDefault()
    console.log("parameter submitted: ", selectedParam)

    if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]?.url || !selectedParam) {
                console.log("Missing tab URL or target parameter");
                return;
            }
            const currentURL = tabs[0].url;
            const newURL = currentURL + selectedParam
            console.log(currentURL, newURL)
            chrome.tabs.update(tabs[0].id, { url: newURL });


        });
    } else {
        console.warn("Chrome extension API not available");
    }

})

let targetLocale
//Dropdown change
localeDropdwon.addEventListener("change", (e) => {
    targetLocale = e.target.value
    console.log("locale changed: ", targetLocale)
})

//Locale submit button
localeSwitch.addEventListener("submit", () => {
    event.preventDefault()
    console.log("locale submitted: ", targetLocale)

    if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]?.url || !targetLocale) {
                console.log("Missing tab URL or target locale");
                return;
            }

            const currentURL = tabs[0].url;
            const urlObj = new URL(currentURL);
            const pathname = urlObj.pathname;
            const segments = pathname.split('/').filter(Boolean);

            // Replace the first segment (current locale) with the new locale
            segments[0] = targetLocale;
            const newPathname = '/' + segments.join('/');

            urlObj.pathname = newPathname;
            const newURL = urlObj.toString();

            console.log("Navigating to: ", newURL);
            chrome.tabs.update(tabs[0].id, { url: newURL });
        });
    } else {
        console.warn("Chrome extension API not available");
    }
})

//Page open button 
openButton.addEventListener("click", goToSourcePage)

function checkPageContentType() {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]) {
                console.log("No active tab found");
                return;
            }

            const currentURL = tabs[0].url;
            const slug = getSlugFromUrl(currentURL);

            chrome.scripting.executeScript(
                {
                    target: { tabId: tabs[0].id },
                    function: parsePageContent
                },
                (results) => {
                    if (results && results[0]) {
                        const contentType = results[0].result;
                        console.log("Page content type: ", contentType);

                        let modelId;
                        if (contentType === "page") {
                            modelId = "88f4521621a94d8eb05a1dc7e9d1ce37_ab3eae29d1a34383ad68a2ca2ca739a1";
                        } else if (contentType === "landing-page") {
                            modelId = "88f4521621a94d8eb05a1dc7e9d1ce37_90248c906d36466c88c64c4e209f65e9";
                        } else {
                            console.log("Unknown content type");
                            return;
                        }

                        const redirectUrl = `https://builder.io/content?model=${modelId}&text=${slug}`;
                        console.log("Redirecting to: ", redirectUrl);
                        chrome.tabs.create({ url: redirectUrl });
                    }
                }
            );
        });
    } else {
        console.warn("Chrome extension API not available");
    }
}

function getSlugFromUrl(url) {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const segments = pathname.split('/').filter(Boolean);

        // Remove locale (first segment) and get the remaining path as slug
        if (segments.length > 1) {
            return segments.slice(1).join('/');
        }
        return segments[0] || "";
    } catch (error) {
        console.error("Error extracting slug: ", error);
        return "";
    }
}

function parsePageContent() {
    const mainElement = document.querySelector("main");

    if (!mainElement) {
        console.log("No <main> element found");
        return null;
    }

    const dataElbglobals = mainElement.getAttribute("data-elbglobals");

    if (!dataElbglobals) {
        console.log("No data-elbglobals attribute found");
        return null;
    }

    if (dataElbglobals.includes("content_type:landing-page")) {
        return "landing-page";
    } else if (dataElbglobals.includes("content_type:page")) {
        return "page";
    }

    return null;
}

function goToSourcePage() {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]?.url) {
                console.log("No active tab URL found");
                return;
            }

            try {
                const urlObj = new URL(tabs[0].url);

                // First, try to get identifier from URL parameters (preview URL)
                let identifier = urlObj.searchParams.get("builder.overrides.page");

                if (identifier) {
                    console.log("Found identifier in URL parameters");
                    openInBuilder(identifier);
                    return;
                }

                // If not found in URL, try to extract from HTML (live page)
                chrome.scripting.executeScript(
                    {
                        target: { tabId: tabs[0].id },
                        function: extractIdentifierFromHtml
                    },
                    (results) => {
                        if (results && results[0] && results[0].result) {
                            identifier = results[0].result;
                            console.log("Found identifier in HTML class: ", identifier);
                            openInBuilder(identifier);
                        } else {
                            console.log("No identifier found in URL or HTML");
                        }
                    }
                );
            } catch (error) {
                console.error("Error extracting identifier: ", error);
            }
        });
    } else {
        console.warn("Chrome extension API not available");
    }
}

function extractIdentifierFromHtml() {
    const mainElement = document.querySelector("main");

    if (!mainElement) {
        console.log("No <main> element found");
        return null;
    }

    // Find div with builder-component classes
    const builderDiv = mainElement.querySelector("[class*='builder-component-']");

    if (!builderDiv) {
        console.log("No builder component div found");
        return null;
    }

    // Get all classes
    const classes = builderDiv.className.split(' ');

    // Find the class that starts with 'builder-component-'
    const componentClass = classes.find(cls => cls.startsWith('builder-component-'));

    if (componentClass) {
        // Extract the ID by removing 'builder-component-' prefix
        const identifier = componentClass.replace('builder-component-', '');
        console.log("Extracted identifier: ", identifier);
        return identifier;
    }

    return null;
}

function openInBuilder(identifier) {
    const sourceUrl = `https://builder.io/content/${identifier}`;
    console.log("Opening source page: ", sourceUrl);
    chrome.tabs.create({ url: sourceUrl });
}

function extractSymbolContentIds() {
    const symbolElements = document.querySelectorAll('[data-builder-component="symbol"]');
    const contentIds = [];

    symbolElements.forEach((element) => {
        const contentId = element.getAttribute('data-builder-content-id');
        if (contentId) {
            contentIds.push(contentId);
        }
    });

    console.log(`Found ${contentIds.length} symbols with content IDs:`, contentIds);
    return contentIds;
}

function detectSymbolsInTab() {
    console.log("detecting symbols")
    if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]) {
                console.log("No active tab");
                return;
            }

            chrome.scripting.executeScript(
                {
                    target: { tabId: tabs[0].id },
                    function: extractSymbolContentIds
                },
                (results) => {
                    if (results && results[0]) {
                        const contentIds = results[0].result;
                        console.log("Content IDs found:", contentIds);
                        displaySymbolsList(contentIds);
                    }
                }
            );
        });
    } else {
        console.warn("Chrome extension API not available");
    }
}

function displaySymbolsList(contentIds) {
    // Clear previous results
    const existingContainer = document.getElementById("symbolsContainer");
    if (existingContainer) {
        existingContainer.remove();
    }

    // Create container
    const container = document.createElement("div");
    container.id = "symbolsContainer";
    container.style.cssText = `
        margin-top: 16px;
        padding: 12px;
        border: 1px solid #e6e6e6;
        border-radius: 4px;
        max-height: 200px;
        overflow-y: auto;
    `;

    // Add title
    const title = document.createElement("h3");
    title.textContent = `Found ${contentIds.length} Symbols`;
    title.style.margin = "0 0 12px 0";
    container.appendChild(title);

    // Create buttons for each symbol
    contentIds.forEach((contentId) => {
        const button = document.createElement("button");
        button.textContent = contentId;
        button.style.cssText = `
            display: block;
            width: 100%;
            margin-bottom: 8px;
            padding: 8px;
            text-align: left;
            font-size: 12px;
            word-break: break-all;
        `;

        button.addEventListener("click", () => {
            // Send message to page to scroll to symbol
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "scrollToSymbol",
                    contentId: contentId
                });
            });
        });

        container.appendChild(button);
    });

    // Add to popup
    document.body.appendChild(container);
}

// document.getElementById("detectSymbolsButton").addEventListener("click", detectSymbolsInTab);


//NEON MODE
function neonSwitch() {
    console.log("Neon button clicked!");
    let root = document.querySelector(':root')
    let rootStyles = getComputedStyle(root)
    let fgColor = rootStyles.getPropertyValue('--fgColor')
    let bgColor = rootStyles.getPropertyValue('--bgColor')
    //console.log("Colors:", fgColor, bgColor)
    if (bgColor === 'white') {
        root.style.setProperty('--fgColor', 'white')
        root.style.setProperty('--bgColor', 'black')
        document.body.classList.add("neonized")
    } else {
        root.style.setProperty('--fgColor', 'black')
        root.style.setProperty('--bgColor', 'white')
        document.body.classList.remove("neonized")
    }
}

neonButton.addEventListener("click", neonSwitch)