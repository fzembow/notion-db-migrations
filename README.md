# notion-utils

Useful commands to make bulk changes to Notion databases that are not possible within the UI.

Given the flexibility of Notion, these will somewhat always be one-offs, so think of these more as useful starting points for further customizations / scripts that you may need to be run.

# Usage

- Create or reuse an existing [Notion integration](https://developers.notion.com/docs/getting-started)
- Install the dependendencies here

```
yarn
```

- Run the CLI to see what is available

```
yarn go
```

# Commands

## Archive all pages in db

Individually archives all pages in the Notion database specified by `db-id`.

```
yarn go archive-all-pages-in-db \
  --token <TOKEN> \
  --db-id <DB_ID>
```

This is somewhat slow since it archives one page at a time. However, it's helpful because it does not blow away the database schema.

## Merge select options (choices)

Merge the `input-names` choices into a single `output-name` choice for the `property` in the database with ID `db-id`.

```
yarn go merge-select-options \
  --token <TOKEN> \
  --db-id <DB_ID> \
  --property <PROPERTY_NAME> \
  --output-option <OUTPUT_CHOICE_NAME> \
  --input-options <INPUT1> <...>
```

Note that the output option must already exist.

## Remove select options (choices)

Removes the specified `options` from the `property` column. Works for both **Select** and **Multi-select** properties.

```
yarn go remove-select-options \
  --token <TOKEN> \
  --db-id <DB_ID> \
  --property <PROPERTY_NAME> \
  --options <OPTION1> <...>  \
```

# About

Built by fzembow to help automate product management processes at [Formsort](https://formsort.com).
