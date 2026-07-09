import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outputPath = `${root}/src/content/github-metrics.json`;
const accounts = ["BriskAM", "23f3001694"];
const contributionLogin = "BriskAM";
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const headers = {
	Accept: "application/vnd.github+json",
	"User-Agent": "BriskAM-personal-website"
};

if (token) {
	headers.Authorization = `Bearer ${token}`;
}

const emptyMetrics = {
	generatedAt: new Date().toISOString(),
	windowDays: 30,
	accounts,
	summary: {
		publicRepos: 0,
		totalStars: 0,
		events: 0,
		activeRepos: 0,
		pushes: 0,
		pullRequests: 0,
		issues: 0,
		releases: 0
	},
	topRepos: [],
	recentRepos: [],
	currentMonth: {
		login: contributionLogin,
		label: "",
		totalContributions: 0,
		weeks: []
	}
};

async function fetchJson(url) {
	const response = await fetch(url, { headers });
	if (!response.ok) {
		throw new Error(`${response.status} ${response.statusText} for ${url}`);
	}
	return response.json();
}

async function fetchPages(url, maxPages = 3) {
	const pages = [];
	for (let page = 1; page <= maxPages; page += 1) {
		const pageUrl = `${url}${url.includes("?") ? "&" : "?"}per_page=100&page=${page}`;
		const items = await fetchJson(pageUrl);
		if (!Array.isArray(items) || items.length === 0) {
			break;
		}
		pages.push(...items);
		if (items.length < 100) {
			break;
		}
	}
	return pages;
}

async function fetchGraphql(query, variables) {
	if (!token) {
		throw new Error("GH_TOKEN or GITHUB_TOKEN is required for contribution calendar data");
	}

	const response = await fetch("https://api.github.com/graphql", {
		method: "POST",
		headers: {
			...headers,
			"Content-Type": "application/json"
		},
		body: JSON.stringify({ query, variables })
	});

	const body = await response.json();
	if (!response.ok || body.errors?.length) {
		throw new Error(body.errors?.[0]?.message || `${response.status} ${response.statusText} for GitHub GraphQL`);
	}
	return body.data;
}

function summarizeEvents(events, cutoff) {
	const recentEvents = events.filter((event) => new Date(event.created_at) >= cutoff);
	const activeRepos = new Set(recentEvents.map((event) => event.repo?.name).filter(Boolean));

	return {
		events: recentEvents.length,
		activeRepos: activeRepos.size,
		pushes: recentEvents.filter((event) => event.type === "PushEvent").length,
		pullRequests: recentEvents.filter((event) => event.type === "PullRequestEvent").length,
		issues: recentEvents.filter((event) => event.type === "IssuesEvent").length,
		releases: recentEvents.filter((event) => event.type === "ReleaseEvent").length,
		recentRepos: [...activeRepos].sort().slice(0, 8)
	};
}

function summarizeRepos(repos) {
	const publicRepos = repos.filter((repo) => !repo.private && !repo.fork);
	const totalStars = publicRepos.reduce((total, repo) => total + repo.stargazers_count, 0);
	const topRepos = [...publicRepos]
		.sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.updated_at) - new Date(a.updated_at))
		.slice(0, 5)
		.map((repo) => ({
			name: repo.name,
			stars: repo.stargazers_count,
			url: repo.html_url,
			updatedAt: repo.updated_at
		}));

	return {
		publicRepos: publicRepos.length,
		totalStars,
		topRepos
	};
}

function contributionLevel(level) {
	const levels = {
		NONE: 0,
		FIRST_QUARTILE: 1,
		SECOND_QUARTILE: 2,
		THIRD_QUARTILE: 3,
		FOURTH_QUARTILE: 4
	};

	return levels[level] ?? 0;
}

function currentMonthRange(now = new Date()) {
	const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
	const to = now;
	const label = new Intl.DateTimeFormat("en", {
		month: "long",
		year: "numeric",
		timeZone: "UTC"
	}).format(from);

	return {
		from: from.toISOString(),
		to: to.toISOString(),
		label
	};
}

async function fetchCurrentMonthContributions(fallback) {
	const range = currentMonthRange();
	const query = `
		query CurrentMonthContributions($login: String!, $from: DateTime!, $to: DateTime!) {
			user(login: $login) {
				contributionsCollection(from: $from, to: $to) {
					contributionCalendar {
						totalContributions
						weeks {
							contributionDays {
								date
								contributionCount
								contributionLevel
								weekday
							}
						}
					}
				}
			}
		}
	`;

	try {
		const data = await fetchGraphql(query, {
			login: contributionLogin,
			from: range.from,
			to: range.to
		});

		const calendar = data.user.contributionsCollection.contributionCalendar;
		return {
			login: contributionLogin,
			label: range.label,
			totalContributions: calendar.totalContributions,
			weeks: calendar.weeks.map((week) => ({
				days: week.contributionDays.map((day) => ({
					date: day.date,
					count: day.contributionCount,
					weekday: day.weekday,
					level: contributionLevel(day.contributionLevel)
				}))
			}))
		};
	} catch (error) {
		console.warn(`Using existing contribution calendar fallback: ${error.message}`);
		return fallback.currentMonth || emptyMetrics.currentMonth;
	}
}

async function loadFallback() {
	try {
		return JSON.parse(await readFile(outputPath, "utf8"));
	} catch {
		return emptyMetrics;
	}
}

async function main() {
	const cutoff = new Date();
	cutoff.setUTCDate(cutoff.getUTCDate() - 30);
	const fallback = await loadFallback();

	try {
		const [repoPages, eventPages, currentMonth] = await Promise.all([
			Promise.all(accounts.map((account) => fetchPages(`https://api.github.com/users/${account}/repos?type=owner&sort=updated`, 4))),
			Promise.all(accounts.map((account) => fetchPages(`https://api.github.com/users/${account}/events/public`, 3))),
			fetchCurrentMonthContributions(fallback)
		]);

		const repoSummary = summarizeRepos(repoPages.flat());
		const eventSummary = summarizeEvents(eventPages.flat(), cutoff);
		const metrics = {
			generatedAt: new Date().toISOString(),
			windowDays: 30,
			accounts,
			summary: {
				publicRepos: repoSummary.publicRepos,
				totalStars: repoSummary.totalStars,
				events: eventSummary.events,
				activeRepos: eventSummary.activeRepos,
				pushes: eventSummary.pushes,
				pullRequests: eventSummary.pullRequests,
				issues: eventSummary.issues,
				releases: eventSummary.releases
			},
			topRepos: repoSummary.topRepos,
			recentRepos: eventSummary.recentRepos,
			currentMonth
		};

		await mkdir(dirname(outputPath), { recursive: true });
		await writeFile(outputPath, `${JSON.stringify(metrics, null, 2)}\n`);
		console.log(`Updated GitHub metrics: ${metrics.summary.events} events across ${metrics.summary.activeRepos} repos`);
	} catch (error) {
		await writeFile(outputPath, `${JSON.stringify(fallback, null, 2)}\n`);
		console.warn(`Using existing GitHub metrics fallback: ${error.message}`);
	}
}

await main();
