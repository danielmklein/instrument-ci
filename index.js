const newrelic = require('newrelic')
const core = require('@actions/core');
const github = require('@actions/github');

try {
  var context = github.context

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
} catch (error) {
  core.setFailed(error.message);
}
