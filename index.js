// TODOs:
// - figure out how to make new relic app name configurable via param
// - figure out how to put repo name into event... maybe also base branch
// - figure out how to make new relic license key configurable via param
// - figure out how to structure these events
// - cleanup readme

const newrelic = require('newrelic')
const core = require('@actions/core');
const github = require('@actions/github');

try {
  var context = github.context
  // console.log(context)

  if (context.eventName != "pull_request") {
    var message = "This action currently only supports pull request events"
    core.setFailed(message);
    return
  }

  var event_action = context.payload.action
  var supported_event_actions = ["closed"]
  if (!supported_event_actions.includes(event_action)) {
    var message = "This action currently only supports 'closed' actions for pull request events"
    core.setFailed(message);
    return
  }

  if (event_action == "closed" && !context.payload.pull_request.merged) {
    console.log("Pull request was closed without merge -- taking no action.")
    return
  }

  const pull_request = context.payload.pull_request;
  const repo = context.payload.repository;

  // console.log(pull_request)
  // console.log("PR# " + pull_request.number)
  // console.log("created_at " + pull_request.created_at)
  // console.log("now: " + Date.now())
  // console.log("total_additions: " + pull_request.additions)
  // console.log("total_additions: " + pull_request.deletions)
  // console.log("total_changed_files: ", pull_request.changed_files)

  var event_name = "pull_request_event"
  var event_attributes = {
    repo_name: repo.name,
    pull_request_number: pull_request.number,
    author: pull_request.user.login,
    base_branch_name: pull_request.base.ref,
    total_additions: pull_request.additions,
    total_deletions: pull_request.deletions,
    changed_files: pull_request.changed_files,
    created_at: Date.parse(pull_request.created_at)
  }

  console.log(`sending ${event_name} event to New Relic with the following attributes:`)
  console.log(event_attributes)
  newrelic.recordCustomEvent(event_name, event_attributes)

  // core.setOutput('additions', pr.additions);
  // core.setOutput('deletions', pr.deletions);
  // core.setOutput('commits', pr.commits);
  // core.setOutput('assignee', pr.assignee);
  // core.setOutput('number', pr.number);
  // core.setOutput('title', pr.title);
  // core.setOutput('body', pr.body);
  // core.setOutput('created_at', pr.created_at);
  // core.setOutput('updated_at', pr.updated_at);
  // core.setOutput('url', pr.html_url);
  // core.setOutput('base_branch', pr.base.ref);
  // core.setOutput('base_commit', pr.base.sha);
  // core.setOutput('head_branch', pr.head.ref);
  // core.setOutput('head_commit', pr.head.sha);
  // core.setOutput('draft', pr.draft);
} catch (error) {
  core.setFailed(error.message);
}
