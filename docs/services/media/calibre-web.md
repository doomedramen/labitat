# Calibre-Web

Web-based e-book library manager for your Calibre collection.

## Configuration

| Field    | Type     | Required | Description                                              |
| -------- | -------- | -------- | -------------------------------------------------------- |
| URL      | URL      | Yes      | Calibre-Web URL (e.g., `https://calibre-web.local:8083`) |
| Username | Text     | Yes      | Calibre-Web account username                             |
| Password | Password | Yes      | Calibre-Web account password                             |

## Widget Displays

- Total books
- Total authors
- Total series
- Total formats

## Notes

This widget signs in to Calibre-Web and queries its OPDS stats endpoint. It shows the total number of books, authors, series, and formats in your collection.
