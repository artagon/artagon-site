#!/usr/bin/env node
/* eslint-disable no-console */

import fs from 'node:fs';
import path from 'node:path';

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) return undefined;
  return process.argv[index + 1];
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return null;
  }
}

function extractIssueRefs(text) {
  if (!text) return [];
  const numbers = new Set();
  const lines = text.split(/\r?\n/);
  const specLines = lines.filter((line) =>
    /spec\/?proposal|spec reference|spec issue|openspec/i.test(line)
  );

  const candidates = specLines.length > 0 ? specLines.join('\n') : text;
  const matches = candidates.match(/#(\d+)/g) || [];
  for (const match of matches) {
    numbers.add(Number(match.replace('#', '')));
  }

  return Array.from(numbers).filter((value) => Number.isInteger(value) && value > 0);
}

function extractAcceptanceCriteria(body) {
  if (!body) return [];
  const sectionMatch = body.match(/(^|\n)#{1,6}\s*Acceptance Criteria\s*\n([\s\S]*?)(\n#{1,6}\s|\n---\n|$)/i);
  if (!sectionMatch) return [];

  const section = sectionMatch[2] || '';
  const criteria = [];
  for (const line of section.split(/\r?\n/)) {
    const match = line.match(/^\s*[-*]\s+\[[ xX]\]\s+(.*)$/);
    if (match && match[1]) {
      criteria.push(match[1].trim());
    }
  }

  return criteria;
}

async function fetchJson(url, token) {
  const headers = {
    Accept: 'application/vnd.github+json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API request failed (${response.status}): ${text}`);
  }
  return response.json();
}

async function main() {
  const outputPath = getArgValue('--output');
  const repoArg = getArgValue('--repo');
  const prArg = getArgValue('--pr');
  const bodyArg = getArgValue('--body');
  const bodyFileArg = getArgValue('--body-file');
  const failOnMissing = hasFlag('--fail-on-missing');

  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const repo = repoArg || process.env.GITHUB_REPOSITORY;
  const errors = [];

  let prBody = bodyArg;
  let prNumber = prArg ? Number(prArg) : undefined;
  let prTitle = undefined;

  if (bodyFileArg) {
    try {
      prBody = fs.readFileSync(bodyFileArg, 'utf8');
    } catch (error) {
      errors.push(`Failed to read PR body file: ${error.message}`);
    }
  }

  if (!prBody && process.env.GITHUB_EVENT_PATH) {
    const eventPayload = readJson(process.env.GITHUB_EVENT_PATH);
    if (eventPayload && eventPayload.pull_request) {
      prBody = eventPayload.pull_request.body || '';
      prNumber = prNumber || eventPayload.pull_request.number;
      prTitle = eventPayload.pull_request.title;
    }
  }

  const repoInfo = repo ? repo.split('/') : [];
  const owner = repoInfo[0];
  const repoName = repoInfo[1];

  if (!owner || !repoName) {
    errors.push('Repository is required. Set GITHUB_REPOSITORY or pass --repo owner/name.');
  }

  if (prNumber && owner && repoName) {
    try {
      const prData = await fetchJson(
        `https://api.github.com/repos/${owner}/${repoName}/pulls/${prNumber}`,
        token
      );
      prBody = prBody || prData.body || '';
      prTitle = prTitle || prData.title;
    } catch (error) {
      errors.push(`Failed to fetch PR #${prNumber}: ${error.message}`);
    }
  }

  if (!prBody) {
    errors.push('PR body not found. Provide --body, --body-file, or GITHUB_EVENT_PATH.');
  }

  const issueRefs = extractIssueRefs(prBody || '');
  const specIssues = [];
  let specIssue = null;

  if (issueRefs.length === 0) {
    specIssue = null;
  } else if (owner && repoName) {
    if (!token) {
      errors.push('GITHUB_TOKEN or GH_TOKEN is required to fetch spec issues.');
    } else {
      for (const issueNumber of issueRefs) {
        try {
          const issue = await fetchJson(
            `https://api.github.com/repos/${owner}/${repoName}/issues/${issueNumber}`,
            token
          );
          const labels = (issue.labels || []).map((label) => label.name);
          specIssues.push({
            number: issue.number,
            title: issue.title,
            url: issue.html_url,
            labels,
            body: issue.body || '',
          });
          if (labels.includes('spec')) {
            specIssue = specIssues[specIssues.length - 1];
            break;
          }
        } catch (error) {
          errors.push(`Failed to fetch issue #${issueNumber}: ${error.message}`);
        }
      }
    }
  }

  const acceptanceCriteria = specIssue
    ? extractAcceptanceCriteria(specIssue.body)
    : [];

  const missingSpecReference = !specIssue;
  const ok = errors.length === 0 && (!failOnMissing || !missingSpecReference);

  const result = {
    ok,
    repo,
    pr: {
      number: prNumber || null,
      title: prTitle || null,
    },
    specIssue: specIssue
      ? {
          number: specIssue.number,
          title: specIssue.title,
          url: specIssue.url,
          labels: specIssue.labels,
        }
      : null,
    acceptanceCriteria,
    missingSpecReference,
    errors,
  };

  const output = JSON.stringify(result, null, 2);
  if (outputPath) {
    const resolvedPath = path.resolve(outputPath);
    fs.writeFileSync(resolvedPath, output);
  } else {
    console.log(output);
  }

  if (!ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`validate-spec-reference failed: ${error.message}`);
  process.exit(1);
});
