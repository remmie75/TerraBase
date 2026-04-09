const clocks = [
    {
        timeId: "clock-us",
        dateId: "date-us",
        timeZone: "America/New_York"
    },
    {
        timeId: "clock-iran",
        dateId: "date-iran",
        timeZone: "Asia/Tehran"
    },
    {
        timeId: "clock-amsterdam",
        dateId: "date-amsterdam",
        timeZone: "Europe/Amsterdam"
    }
];

const newsFeedUrls = [
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    "https://www.aljazeera.com/xml/rss/all.xml",
    "https://www.theguardian.com/world/rss"
];

const topics = {
    sports: {
        name: "Sports",
        subtitle: "Live sports headlines, scores, and major tournament updates",
        tickerLabel: "Sports Headlines",
        ariaLabel: "Sports headlines",
        imageFallbackText: "Sports",
        emptyText: "No fresh sports headlines are available right now.",
        keywords: ["sports", "football", "soccer", "nba", "nfl", "mlb", "tennis", "formula 1", "olympics", "cricket"]
    },
    "middle-east": {
        name: "Middle East",
        subtitle: "Live geopolitical and security headlines from the region",
        tickerLabel: "Middle East Headlines",
        ariaLabel: "Middle East headlines",
        imageFallbackText: "Middle East",
        emptyText: "No fresh Middle East headlines are available right now.",
        keywords: ["middle east", "iran", "israel", "gaza", "lebanon", "syria", "hamas", "hezbollah"]
    },
    energy: {
        name: "Energy Markets",
        subtitle: "Oil, gas, and power market developments around the world",
        tickerLabel: "Energy Market Headlines",
        ariaLabel: "Energy market headlines",
        imageFallbackText: "Energy",
        emptyText: "No fresh energy market headlines are available right now.",
        keywords: ["oil", "gas", "energy", "opec", "brent", "wti", "power grid", "renewables"]
    },
    technology: {
        name: "Technology",
        subtitle: "Major tech stories including AI, chips, and cybersecurity",
        tickerLabel: "Technology Headlines",
        ariaLabel: "Technology headlines",
        imageFallbackText: "Tech",
        emptyText: "No fresh technology headlines are available right now.",
        keywords: ["technology", "tech", "ai", "artificial intelligence", "chip", "semiconductor", "cyber", "software"]
    },
    "global-economy": {
        name: "Global Economy",
        subtitle: "Inflation, central banks, trade, and macroeconomic shifts",
        tickerLabel: "Global Economy Headlines",
        ariaLabel: "Global economy headlines",
        imageFallbackText: "Economy",
        emptyText: "No fresh global economy headlines are available right now.",
        keywords: ["economy", "inflation", "interest rate", "fed", "ecb", "trade", "gdp", "recession"]
    },
    climate: {
        name: "Climate",
        subtitle: "Climate policy, weather extremes, and environmental change",
        tickerLabel: "Climate Headlines",
        ariaLabel: "Climate headlines",
        imageFallbackText: "Climate",
        emptyText: "No fresh climate headlines are available right now.",
        keywords: ["climate", "weather", "flood", "wildfire", "emissions", "cop", "drought", "warming"]
    }
};

let syncedUtcMs = Date.now();
let syncAtClientMs = Date.now();
let activeTopicKey = "sports";

async function fetchInternetUtcMs() {
    const primaryUrl = "https://worldtimeapi.org/api/timezone/Etc/UTC";
    const fallbackUrl = "https://timeapi.io/api/Time/current/zone?timeZone=UTC";

    try {
        const response = await fetch(primaryUrl, { cache: "no-store" });
        if (!response.ok) {
            throw new Error("Primary time API failed");
        }

        const data = await response.json();
        if (!data || typeof data.unixtime !== "number") {
            throw new Error("Primary time API returned invalid payload");
        }

        return data.unixtime * 1000;
    } catch {
        const fallbackResponse = await fetch(fallbackUrl, { cache: "no-store" });
        if (!fallbackResponse.ok) {
            throw new Error("Fallback time API failed");
        }

        const fallbackData = await fallbackResponse.json();
        if (!fallbackData || !fallbackData.dateTime) {
            throw new Error("Fallback time API returned invalid payload");
        }

        return Date.parse(fallbackData.dateTime);
    }
}

async function syncClockBaseTime() {
    try {
        syncedUtcMs = await fetchInternetUtcMs();
        syncAtClientMs = Date.now();
    } catch {
        // Keep clocks running with last known sync value if APIs are unavailable.
    }
}

function getFallbackImageUrl(topic) {
    const label = encodeURIComponent(topic.imageFallbackText);
    return `https://via.placeholder.com/600x600/111111/ff5555?text=${label}`;
}

function normalizeTitle(value) {
    return (value || "").toLowerCase();
}

function isTopicHeadline(title, topic) {
    const normalizedTitle = normalizeTitle(title);
    return topic.keywords.some((keyword) => normalizedTitle.includes(keyword));
}

function updateTopicMeta(topic) {
    const titleElement = document.getElementById("dashboard-title");
    const subtitleElement = document.getElementById("dashboard-subtitle");
    const tickerLabelElement = document.getElementById("ticker-label");
    const headlineSection = document.getElementById("headline-section");
    const newsGrid = document.getElementById("news-grid");

    if (titleElement) {
        titleElement.textContent = `${topic.name} Dashboard`;
    }

    if (subtitleElement) {
        subtitleElement.textContent = topic.subtitle;
    }

    if (tickerLabelElement) {
        tickerLabelElement.textContent = topic.tickerLabel;
    }

    if (headlineSection) {
        headlineSection.setAttribute("aria-label", topic.ariaLabel);
    }

    if (newsGrid) {
        newsGrid.setAttribute("aria-label", `${topic.name} news images`);
    }

    document.title = `${topic.name} Dashboard`;
}

function setTickerHeadlines(headlines, topic) {
    const tickerTrack = document.getElementById("ticker-track");
    if (!tickerTrack) {
        return;
    }

    if (!headlines.length) {
        tickerTrack.innerHTML = `<span class="ticker-item">${topic.emptyText}</span>`;
        return;
    }

    tickerTrack.replaceChildren();

    for (let loopIndex = 0; loopIndex < 2; loopIndex += 1) {
        headlines.forEach((headline, index) => {
            const link = document.createElement("a");
            link.className = "ticker-item";
            link.href = headline.link;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = headline.title;
            tickerTrack.appendChild(link);

            const isLastOfLoop = index === headlines.length - 1;
            if (!isLastOfLoop) {
                const separator = document.createElement("span");
                separator.className = "ticker-separator";
                separator.textContent = "|";
                tickerTrack.appendChild(separator);
            }
        });

        if (loopIndex === 0) {
            const divider = document.createElement("span");
            divider.className = "ticker-separator";
            divider.textContent = "||";
            tickerTrack.appendChild(divider);
        }
    }
}

function setNewsImageGrid(headlines, topic) {
    for (let index = 0; index < 3; index += 1) {
        const headline = headlines[index];
        const cardNumber = index + 1;

        const linkElement = document.getElementById(`news-link-${cardNumber}`);
        const imageElement = document.getElementById(`news-image-${cardNumber}`);
        const titleElement = document.getElementById(`news-title-${cardNumber}`);

        if (!linkElement || !imageElement || !titleElement) {
            continue;
        }

        if (!headline) {
            linkElement.removeAttribute("href");
            imageElement.src = getFallbackImageUrl(topic);
            imageElement.alt = `${topic.name} image placeholder`;
            titleElement.textContent = `No ${topic.name.toLowerCase()} image headline currently available.`;
            continue;
        }

        linkElement.href = headline.link;
        imageElement.src = headline.image || getFallbackImageUrl(topic);
        imageElement.alt = headline.title;
        titleElement.textContent = headline.title;
    }
}

function pickImageUrl(item) {
    if (item.thumbnail) {
        return item.thumbnail;
    }

    if (Array.isArray(item.enclosure) && item.enclosure.length > 0 && item.enclosure[0].link) {
        return item.enclosure[0].link;
    }

    if (item.enclosure && item.enclosure.link) {
        return item.enclosure.link;
    }

    return "";
}

async function fetchHeadlinesFromFeed(feedUrl) {
    const rssProxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
    const response = await fetch(rssProxyUrl, { cache: "no-store" });

    if (!response.ok) {
        throw new Error("Failed to fetch feed");
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.items)) {
        return [];
    }

    return data.items
        .filter((item) => item && item.title && item.link)
        .map((item) => ({
            title: item.title.trim(),
            link: item.link,
            image: pickImageUrl(item)
        }));
}

async function refreshHeadlinesTicker() {
    const topic = topics[activeTopicKey] || topics.sports;

    try {
        const feedResults = await Promise.all(newsFeedUrls.map((feedUrl) => fetchHeadlinesFromFeed(feedUrl)));

        const allHeadlines = feedResults.flat();
        const topicHeadlines = allHeadlines.filter((item) => isTopicHeadline(item.title, topic));
        const uniqueTopicHeadlines = Array.from(new Map(topicHeadlines.map((item) => [item.title, item])).values());

        setTickerHeadlines(uniqueTopicHeadlines, topic);
        setNewsImageGrid(uniqueTopicHeadlines, topic);
    } catch {
        setTickerHeadlines([], topic);
        setNewsImageGrid([], topic);
    }
}

function formatTime(date, timeZone) {
    return new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    }).format(date);
}

function formatDate(date, timeZone) {
    return new Intl.DateTimeFormat("en-GB", {
        timeZone,
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(date);
}

function updateClocks() {
    const now = new Date(syncedUtcMs + (Date.now() - syncAtClientMs));

    clocks.forEach((clock) => {
        const timeElement = document.getElementById(clock.timeId);
        const dateElement = document.getElementById(clock.dateId);

        if (!timeElement || !dateElement) {
            return;
        }

        timeElement.textContent = formatTime(now, clock.timeZone);
        dateElement.textContent = formatDate(now, clock.timeZone);
    });
}

function initializeTopicSelector() {
    const selectElement = document.getElementById("topic-select");
    if (!selectElement) {
        return;
    }

    const initialValue = selectElement.value;
    if (topics[initialValue]) {
        activeTopicKey = initialValue;
    }

    updateTopicMeta(topics[activeTopicKey]);

    selectElement.addEventListener("change", async (event) => {
        const selectedValue = event.target.value;
        if (!topics[selectedValue]) {
            return;
        }

        activeTopicKey = selectedValue;
        const topic = topics[activeTopicKey];
        updateTopicMeta(topic);

        const tickerTrack = document.getElementById("ticker-track");
        if (tickerTrack) {
            tickerTrack.innerHTML = `<span class="ticker-item">Loading ${topic.name.toLowerCase()} headlines...</span>`;
        }

        await refreshHeadlinesTicker();
    });
}

initializeTopicSelector();

updateClocks();
setInterval(updateClocks, 1000);

syncClockBaseTime();
setInterval(syncClockBaseTime, 60000);

refreshHeadlinesTicker();
setInterval(refreshHeadlinesTicker, 300000);