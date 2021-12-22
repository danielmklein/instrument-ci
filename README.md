# Instrument CI GitHub Action

When someone merges a pull request, this action sends a custom event to New Relic with info about the PR like...
* the PR author
* how many lines were added or deleted
* when the PR was originally created



There is huge potential in the future for the following:
1. increasing the amount of info we put into the custom PR event
2. allowing this Action to send info to platforms other than New Relic
3. increasing the scope of things this Action supports, such as PR events other than merges and even tracking events on other stuff involved in the dev process, like how long individual CI steps take!

## Inputs

No inputs are currently supported.

*HOWEVER,* in order for reporting to New Relic to work, you must pass the environment variable `NEW_RELIC_LICENSE_KEY` to this Action with the value being your New Relic license key.
Likewise, it is highly recommended that you pass the `NEW_RELIC_APP_NAME` environment variable to customize the application for which the events are reported. Otherwise, it will default to `My Application`.

## Outputs

This action currently does not return any outputs.

## Example usage
```yaml
on:
  pull_request:
    types: [closed]
jobs:
  report_pr_event:
    runs-on: ubuntu-latest
    name: send PR event to New Relic
    steps:
      - name: send event
        uses: danielmklein/instrument-ci@main
        env:
          NEW_RELIC_LICENSE_KEY: ${{ secrets.NEW_RELIC_LICENSE_KEY }}
          NEW_RELIC_APP_NAME: "GitHub Actions Test"
```