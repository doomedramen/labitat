name: Feature Request
description: Suggest an idea or improvement for Labitat
title: "feat: "
labels: ["enhancement"]
body:

- type: markdown
  attributes:
  value: |
  Thanks for suggesting a feature! Please describe your idea and why it would be useful.
- type: textarea
  id: problem
  attributes:
  label: Is your feature request related to a problem?
  description: A clear and concise description of what the problem is.
  placeholder: I'm always frustrated when...
  validations:
  required: false
- type: textarea
  id: solution
  attributes:
  label: Describe the Solution
  description: A clear and concise description of what you want to happen.
  validations:
  required: true
- type: textarea
  id: alternatives
  attributes:
  label: Describe Alternatives
  description: Any alternative solutions or features you've considered.
  validations:
  required: false
- type: textarea
  id: context
  attributes:
  label: Additional Context
  description: Add any other context, mockups, or screenshots about the feature request here.
  validations:
  required: false
