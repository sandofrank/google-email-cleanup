# Gmail Cleanup Script

A Google Apps Script that safely deletes old Gmail messages with built-in debugging and graceful rate limiting to avoid API quotas.

## Features

- **Smart Rate Limiting**: Processes emails in small batches with appropriate delays to avoid Gmail API limits
- **Comprehensive Debugging**: Detailed timestamped logging with different severity levels
- **Error Recovery**: Automatic retry logic with exponential backoff for API errors
- **Safety Features**: Preview mode, configurable limits, and comprehensive error handling
- **Flexible Time Periods**: Delete emails older than 2 years (default) or specify custom timeframes
- **Batch Processing**: Handles large email volumes efficiently without timeouts

## Quick Start

1. Go to [Google Apps Script](https://script.google.com)
2. Create a new project
3. Replace the default code with the script from `gmail-cleanup.gs`
4. Save and authorize Gmail access when prompted
5. Run `previewOldEmails()` first to see what would be deleted
6. Run `deleteOldEmails()` to perform the actual cleanup

## Functions

### Main Functions

- **`deleteOldEmails()`** - Deletes emails older than 2 years
- **`previewOldEmails()`** - Dry run to preview what would be deleted (recommended first step)
- **`deleteEmailsOlderThan(days)`** - Delete emails older than specified number of days
- **`emptyTrash()`** - Permanently delete emails from trash

### Usage Examples

```javascript
// Preview what would be deleted (safe to run)
previewOldEmails();

// Delete emails older than 2 years (default)
deleteOldEmails();

// Delete emails older than 6 months
deleteEmailsOlderThan(180);

// Delete emails older than 1 year
deleteEmailsOlderThan(365);

// Permanently empty trash
emptyTrash();
```

## Configuration

Adjust these constants at the top of the script:

```javascript
const DEBUG_MODE = true;           // Set to false to reduce logging
const MAX_BATCH_SIZE = 50;         // Threads per batch (smaller = more graceful)
const DELAY_BETWEEN_BATCHES = 3000; // Delay in milliseconds
const SAFETY_LIMIT = 10000;        // Maximum threads to delete in one run
const MAX_RETRIES = 3;             // Retry attempts on API errors
```

## Safety Features

### Built-in Protections
- **Safety Limit**: Stops after deleting 10,000 threads by default
- **Trash First**: Emails are moved to trash, not permanently deleted
- **Preview Mode**: Test what would be deleted before running
- **Error Recovery**: Continues processing after temporary API errors
- **Batch Processing**: Small batches prevent timeouts and reduce API load

### Rate Limiting
- Processes 50 threads per batch (conservative)
- 3-second delays between batches
- Exponential backoff on errors (3s, 6s, 12s delays)
- Automatic retry logic with maximum attempt limits

## Logging and Debugging

The script provides detailed logging with timestamps:

```
[2024-08-30T10:30:15.123Z] [IMPORTANT] Starting Gmail cleanup process
[2024-08-30T10:30:15.234Z] [INFO] Search parameters: before 2022/08/30 (2 years ago)
[2024-08-30T10:30:16.345Z] [IMPORTANT] Batch 1: Found 50 threads to delete
[2024-08-30T10:30:16.456Z] [INFO] Sample thread date: Thu Aug 15 2022, Subject: "Weekly Newsletter..."
[2024-08-30T10:30:17.567Z] [IMPORTANT] Batch 1 completed. Deleted: 50, Total: 50
```

## Error Handling

- **API Rate Limits**: Automatic backoff and retry
- **Network Issues**: Retry with increasing delays
- **Permission Errors**: Clear error messages with troubleshooting
- **Quota Exceeded**: Graceful stopping with progress report
- **Unexpected Errors**: Detailed logging with stack traces

## Performance

Typical performance metrics:
- **Small cleanup** (< 1000 emails): 5-10 minutes
- **Medium cleanup** (1000-5000 emails): 15-30 minutes  
- **Large cleanup** (5000+ emails): 30+ minutes
- **Processing rate**: ~10-20 threads per minute (varies by API conditions)

## Troubleshooting

### Common Issues

**"Insufficient permissions"**
- Re-run the script and complete the OAuth authorization flow
- Ensure you're using your own Gmail account

**"Service invoked too many times"**
- The script has built-in rate limiting to prevent this
- If it occurs, increase `DELAY_BETWEEN_BATCHES` or decrease `MAX_BATCH_SIZE`

**Script timeout**
- Google Apps Script has a 6-minute execution limit
- The script is designed to work within this limit with batching
- For very large cleanups, you may need to run the script multiple times

**No emails found**
- Check the date format in logs
- Verify emails exist older than the specified timeframe
- Try running `previewOldEmails()` to see what's available

### Debugging Tips

1. **Start with preview**: Always run `previewOldEmails()` first
2. **Check logs**: Monitor the execution transcript for detailed progress
3. **Test small batches**: Reduce `SAFETY_LIMIT` to test with fewer emails
4. **Adjust timing**: Increase delays if you encounter rate limiting

## Important Notes

### What Gets Deleted
- **All folders**: Inbox, Sent, Archives, custom labels
- **Thread-based**: Entire email conversations, not individual messages
- **Trash first**: Emails go to trash, not permanent deletion
- **Date-based**: Uses the last message date in each thread

### What Doesn't Get Deleted
- **Trash contents**: Use `emptyTrash()` separately if needed
- **Recent emails**: Only emails older than specified timeframe
- **Important emails**: No special handling for starred/important emails

## Contributing

Feel free to submit issues or pull requests to improve the script. When contributing:

1. Test changes thoroughly with the preview function
2. Follow the existing error handling patterns
3. Update documentation for new features
4. Maintain backward compatibility

## License

This script is provided as-is under the MIT License. Use at your own risk and always test with preview mode first.

## Disclaimer

This script permanently moves emails to trash. While emails can be recovered from trash for 30 days, use caution and test thoroughly before running on important email accounts. Always run `previewOldEmails()` first to understand what will be deleted.
