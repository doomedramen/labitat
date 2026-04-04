name: Bug Report
description: Report a bug or unexpected behavior
title: "bug: "
labels: ["bug"]
body:

- type: markdown
  attributes:
  value: |
  Thanks for taking the time to report a bug. Please fill in as much detail as possible.
- type: textarea
  id: description
  attributes:
  label: Describe the Bug
  description: A clear and concise description of what the bug is.
  placeholder: When I click X, Y happens instead of Z.
  validations:
  required: true
- type: textarea
  id: reproduction
  attributes:
  label: Steps to Reproduce
  description: How can we reproduce this issue?
  placeholder: | 1. Go to '...' 2. Click on '...' 3. See error
  validations:
  required: true
- type: textarea
  id: expected
  attributes:
  label: Expected Behavior
  description: What did you expect to happen?
  validations:
  required: true
- type: dropdown
  id: install-method
  attributes:
  label: Installation Method
  options: - Docker Compose - install.sh (Native) - Manual (pnpm) - Other
  validations:
  required: true
- type: input
  id: version
  attributes:
  label: Labitat Version
  description: Check the footer or your container logs for the version.
  placeholder: e.g., 0.0.52
  validations:
  required: true
- type: textarea
  id: environment
  attributes:
  label: Environment
  description: |
  Please provide details about your environment.
  placeholder: | - OS: Debian 12 / Ubuntu 22.04 / Proxmox 8 / etc. - Node.js: 20.x - Browser: Chrome 120, Firefox 121, etc. - Docker: 24.x (if applicable)
  validations:
  required: true
- type: textarea
  id: logs
  attributes:
  label: Relevant Logs
  description: Paste any relevant logs, error messages, or screenshots.
  render: shell
  validations:
  required: false
- type: textarea
  id: additional
  attributes:
  label: Additional Context
  description: Add any other context about the problem here.
  validations:
  required: false
