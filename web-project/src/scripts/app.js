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
	"https://www.aljazeera.com/xml/rss/all.xml",
	"https://rss.nytimes.com/services/xml/rss/nyt/World.xml"
];

const conflictKeywords = [
	"middle east",
	"israel",
	"gaza",
	"iran",
	"hamas",
	"hezbollah",
	"lebanon",
	"syria",
	"yemen",
	"west bank"
];

let syncedUtcMs = Date.now();
let lastSyncLocalMs = Date.now();

async function fetchInternetUtcMs() {
	const primaryUrl = "https://worldtimeapi.org/api/timezone/Etc/UTC";
	const fallbackUrl = "https://timeapi.io/api/Time/current/zone?timeZone=UTC";

	try {
		const response = await fetch(primaryUrl, { cache: "no-store" });
		if (!response.ok) {
			throw new Error("Primary time API failed");
		}

		const data = await response.json();
		if (!data.utc_datetime) {
			throw new Error("Primary time API returned invalid payload");
		}

		return Date.parse(data.utc_datetime);
	} catch (primaryError) {
		const fallbackResponse = await fetch(fallbackUrl, { cache: "no-store" });
		if (!fallbackResponse.ok) {
			throw new Error("Fallback time API failed");
		}

		const fallbackData = await fallbackResponse.json();
		if (!fallbackData.dateTime) {
			throw new Error("Fallback time API returned invalid payload");
		}

		return Date.parse(fallbackData.dateTime + "Z");
	}
}

async function syncInternetTime() {
	try {
		syncedUtcMs = await fetchInternetUtcMs();
		lastSyncLocalMs = Date.now();
	} catch (error) {
		// Keep clocks running using last known sync value if the internet API is unavailable.
	}
}

function getCurrentSyncedDate() {
	const elapsedMs = Date.now() - lastSyncLocalMs;
	return new Date(syncedUtcMs + elapsedMs);
}

function isConflictHeadline(title) {
	const normalizedTitle = title.toLowerCase();
	return conflictKeywords.some((keyword) => normalizedTitle.includes(keyword));
}

function setTickerHeadlines(headlines) {
	const tickerTrack = document.getElementById("ticker-track");
	if (!tickerTrack) {
		return;
	}

	if (!headlines.length) {
		tickerTrack.innerHTML = "<span class=\"ticker-item\">No fresh conflict headlines available right now.</span>";
		return;
	}

	tickerTrack.replaceChildren();

	// Duplicate once for smoother looping.
	for (let repeat = 0; repeat < 2; repeat += 1) {
		headlines.forEach((headline, index) => {
			const link = document.createElement("a");
			link.className = "ticker-item";
			link.href = headline.link;
			link.target = "_blank";
			link.rel = "noopener noreferrer";
			link.textContent = headline.title;
			tickerTrack.appendChild(link);

			const isLastOfLoop = index === headlines.length - 1;
			if (!isLastOfLoop || repeat === 0) {
				const separator = document.createElement("span");
				separator.className = "ticker-separator";
				separator.textContent = "⭐";
				tickerTrack.appendChild(separator);
			}
		});
	}
}

function getFallbackImageUrl() {
	return "https://via.placeholder.com/600x600/111111/ff5555?text=No+Image";
}

function setNewsImageGrid(headlines) {
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
			linkElement.href = "#";
			imageElement.src = getFallbackImageUrl();
			titleElement.textContent = "No related image headline currently available.";
			continue;
		}

		linkElement.href = headline.link;
		imageElement.src = headline.image || getFallbackImageUrl();
		imageElement.alt = headline.title;
		titleElement.textContent = headline.title;
	}
}

function extractImageUrl(item) {
	if (item.thumbnail) {
		return item.thumbnail;
	}

	if (item.enclosure && item.enclosure.link) {
		return item.enclosure.link;
	}

	if (typeof item.description === "string") {
		const match = item.description.match(/<img[^>]+src=["']([^"']+)["']/i);
		if (match && match[1]) {
			return match[1];
		}
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
	if (!Array.isArray(data.items)) {
		return [];
	}

	return data.items
		.map((item) => ({
			title: item.title,
			link: item.link,
			image: extractImageUrl(item)
		}))
		.filter((item) => item.title && item.link);
}

async function refreshHeadlinesTicker() {
	try {
		const feedResults = await Promise.allSettled(
			newsFeedUrls.map((feedUrl) => fetchHeadlinesFromFeed(feedUrl))
		);

		const allHeadlines = feedResults
			.filter((result) => result.status === "fulfilled")
			.flatMap((result) => result.value);

		const conflictHeadlines = allHeadlines.filter((item) => isConflictHeadline(item.title));
		const uniqueConflictHeadlines = Array.from(
			new Map(conflictHeadlines.map((item) => [item.title, item])).values()
		).slice(0, 12);

		setTickerHeadlines(uniqueConflictHeadlines);
		setNewsImageGrid(uniqueConflictHeadlines);
	} catch (error) {
		setTickerHeadlines([]);
		setNewsImageGrid([]);
	}
}

function formatTime(now, timeZone) {
	return new Intl.DateTimeFormat("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
		timeZone
	}).format(now);
}

function formatDate(now, timeZone) {
	return new Intl.DateTimeFormat("en-US", {
		weekday: "short",
		year: "numeric",
		month: "short",
		day: "2-digit",
		timeZone
	}).format(now);
}

function updateClocks() {
	const now = getCurrentSyncedDate();

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

syncInternetTime();
setInterval(syncInternetTime, 60000);
updateClocks();
setInterval(updateClocks, 1000);

refreshHeadlinesTicker();
setInterval(refreshHeadlinesTicker, 300000);