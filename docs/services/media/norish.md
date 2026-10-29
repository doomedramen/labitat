# Norish

Shows total recipes, groceries still to buy, groceries marked done, and recipes planned today. Refreshes every 60 seconds. Counts reflect the user/household accessible to the API key. Today follows the Norish server's timezone.

Enter your instance URL, including any URL base, and a key created under **Settings → User → API keys**. Requires Norish's public `/api/v1` API. Older instances without this API must be updated.

Uses the recipe search total with a one-item page, the grocery list, and today's planned recipes. These requests only read data. No recipe names or grocery names are displayed. Any endpoint failure is reported as a widget error.

[Official API reference](https://docs.norish.dev/reference/api/).
