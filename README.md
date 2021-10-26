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

## Archive all pages in a database

Individually archives all pages in the Notion database specified by `db-id`. It's helpful because it does not blow away the database schema, like deleting the database does.

```
yarn go archive-all-pages-in-db \
  --token <TOKEN> \
  --db-id <DB_ID>
```

This is somewhat slow since it archives one page at a time.

## Copy pages

Ensures the target schema is comparible with the source, and then copies pages over individually to the target.

```
yarn go copy-between-dbs \
  --token <TOKEN> \
  --db-id <DB_ID> \
  --target-db-id <TARGET_DB_ID>
```

**IMPORTANT NOTE**: Copying of page _contents_ is not currently implemented.

## Merge select options (choices)

Merge the `input-names` choices into a single `output-name` choice for the `property` in the database with ID `db-id`.

```yarn go merge-select-options \
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

## Remove unused select options (choices)

Removes any choices that are unused by any pages within the `property` column. Works for both **Select** and **Multi-select** properties.

```
yarn go remove-select-options \
  --token <TOKEN> \
  --db-id <DB_ID> \
  --property <PROPERTY_NAME>
```

## Set multi-select from multi-select

For each page in the database, set the `destination-property` based on which of the `options` are set on the `source-property`.

```
yarn go set-multi-select-from-multi-select \
  --token <TOKEN> \
  --db-id <DB_ID> \
  --property <PROPERTY_NAME> \
  --source-property <source-property> \
  --destination-property <destination-property> \
  --options <OPTION1> <...>
```

## Set select from multi-select

For each page in the database, set the `select-property` based on which of the `options` are set on the `multi-select-property`.

```
yarn go set-select-from-multi-select \
  --token <TOKEN> \
  --db-id <DB_ID> \
  --property <PROPERTY_NAME> \
  --select-property <select-property> \
  --multi-select-property <multi-select-property> \
  --options <OPTION1> <...>
```

# About

Built by fzembow to help automate product management processes at [Formsort](https://formsort.com).
