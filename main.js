console.log("main.js loaded");

//DOM elements
const dropdown = document.querySelector("#localeDropDown")
const localeSubmitButton = document.querySelector("#localeSubmitButton")
const localeSwitch = document.querySelector("#localeSwitch")
// const searchButton = document.getElementById("searchButton")
const openButton = document.getElementById("openButton")
const detectSymbolsButton = document.getElementById("detectSymbolsButton")
const neonButton = document.getElementById("neonButton")

//URLS
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


let targetLocale
//Dropdown change
dropdown.addEventListener("change", (e) => {
    targetLocale = e.target.value
    console.log("locale changed: ", targetLocale)
})

//Locale submit button
localeSwitch.addEventListener("submit", () => {
    event.preventDefault()
    console.log("locale submitted: ", targetLocale)

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
})

//Page open button 
openButton.addEventListener("click", goToSourcePage)

function checkPageContentType() {
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
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]?.url) {
            console.log("No active tab URL found");
            return;
        }

        try {
            const urlObj = new URL(tabs[0].url);
            const identifier = urlObj.searchParams.get("builder.overrides.page");

            if (!identifier) {
                console.log("No builder.overrides.page parameter found");
                return;
            }

            const sourceUrl = `https://builder.io/content/${identifier}`;
            console.log("Opening source page: ", sourceUrl);
            chrome.tabs.create({ url: sourceUrl });
        } catch (error) {
            console.error("Error extracting identifier: ", error);
        }
    });
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
                    // Do something with contentIds (display, process, etc.)
                }
            }
        );
    });
}

document.getElementById("detectSymbolsButton").addEventListener("click", detectSymbolsInTab);


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