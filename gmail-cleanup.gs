// Configuration constants
const DEBUG_MODE = true; // Set to false to reduce logging
const MAX_BATCH_SIZE = 50; // Smaller batches for more graceful processing
const DELAY_BETWEEN_BATCHES = 3000; // 3 seconds delay to avoid rate limits
const SAFETY_LIMIT = 10000; // Maximum threads to delete in one run
const MAX_RETRIES = 3; // Number of retries on API errors

// Enhanced logging function
function debugLog(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  
  if (level === 'ERROR') {
    console.error(logMessage);
  } else if (DEBUG_MODE || level === 'IMPORTANT') {
    console.log(logMessage);
  }
}

function deleteOldEmails() {
  debugLog("Starting Gmail cleanup process", "IMPORTANT");
  
  // Calculate the date two years ago
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  
  // Format the date for Gmail search (YYYY/MM/DD)
  const searchDate = Utilities.formatDate(twoYearsAgo, Session.getScriptTimeZone(), 'yyyy/MM/dd');
  const searchQuery = `before:${searchDate}`;
  
  debugLog(`Search parameters: before ${searchDate} (2 years ago)`, "IMPORTANT");
  debugLog(`Using batch size: ${MAX_BATCH_SIZE}, delay: ${DELAY_BETWEEN_BATCHES}ms`);
  
  let totalDeleted = 0;
  let batchCount = 0;
  let retryCount = 0;
  const startTime = new Date();
  
  try {
    // First, get an estimate of total emails to process
    debugLog("Getting initial count estimate...");
    const initialThreads = GmailApp.search(searchQuery, 0, 1);
    if (initialThreads.length === 0) {
      debugLog("No emails found older than 2 years. Nothing to delete.", "IMPORTANT");
      return;
    }
    
    while (true) {
      try {
        debugLog(`Starting batch ${batchCount + 1}`);
        
        // Get threads in smaller batches for more graceful processing
        const threads = GmailApp.search(searchQuery, 0, MAX_BATCH_SIZE);
        
        if (threads.length === 0) {
          debugLog("No more old emails found. Cleanup complete.", "IMPORTANT");
          break;
        }
        
        batchCount++;
        debugLog(`Batch ${batchCount}: Found ${threads.length} threads to delete`);
        
        // Log sample thread info for debugging
        if (DEBUG_MODE && threads.length > 0) {
          const sampleThread = threads[0];
          const sampleDate = sampleThread.getLastMessageDate();
          debugLog(`Sample thread date: ${sampleDate}, Subject: "${sampleThread.getFirstMessageSubject().substring(0, 50)}..."`);
        }
        
        // Move threads to trash with error handling
        debugLog(`Moving ${threads.length} threads to trash...`);
        GmailApp.moveThreadsToTrash(threads);
        totalDeleted += threads.length;
        
        debugLog(`Batch ${batchCount} completed. Deleted: ${threads.length}, Total: ${totalDeleted}`, "IMPORTANT");
        
        // Reset retry count on successful operation
        retryCount = 0;
        
        // Graceful delay to avoid rate limits
        if (threads.length === MAX_BATCH_SIZE) { // Only delay if we got a full batch (more might be coming)
          debugLog(`Waiting ${DELAY_BETWEEN_BATCHES/1000} seconds before next batch...`);
          Utilities.sleep(DELAY_BETWEEN_BATCHES);
        }
        
        // Safety check
        if (totalDeleted >= SAFETY_LIMIT) {
          debugLog(`Reached safety limit of ${SAFETY_LIMIT} deleted threads. Stopping.`, "IMPORTANT");
          break;
        }
        
      } catch (batchError) {
        retryCount++;
        debugLog(`Batch error (attempt ${retryCount}/${MAX_RETRIES}): ${batchError.message}`, "ERROR");
        
        if (retryCount >= MAX_RETRIES) {
          debugLog(`Max retries reached. Stopping process.`, "ERROR");
          throw batchError;
        }
        
        // Exponential backoff for retries
        const retryDelay = DELAY_BETWEEN_BATCHES * Math.pow(2, retryCount);
        debugLog(`Waiting ${retryDelay/1000} seconds before retry...`);
        Utilities.sleep(retryDelay);
        continue;
      }
    }
    
  } catch (error) {
    debugLog(`Fatal error occurred: ${error.message}`, "ERROR");
    debugLog(`Error stack: ${error.stack}`, "ERROR");
    debugLog(`Total threads deleted before error: ${totalDeleted}`, "IMPORTANT");
  }
  
  const endTime = new Date();
  const durationMinutes = Math.round((endTime - startTime) / 60000 * 100) / 100;
  
  debugLog(`=== CLEANUP SUMMARY ===`, "IMPORTANT");
  debugLog(`Total threads deleted: ${totalDeleted}`, "IMPORTANT");
  debugLog(`Total batches processed: ${batchCount}`, "IMPORTANT");
  debugLog(`Process duration: ${durationMinutes} minutes`, "IMPORTANT");
  debugLog(`Average threads per batch: ${batchCount > 0 ? Math.round(totalDeleted / batchCount) : 0}`, "IMPORTANT");
}

// Optional: Enhanced function to delete emails older than a specific number of days
function deleteEmailsOlderThan(days) {
  debugLog(`Starting deletion of emails older than ${days} days`, "IMPORTANT");
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const searchDate = Utilities.formatDate(cutoffDate, Session.getScriptTimeZone(), 'yyyy/MM/dd');
  const searchQuery = `before:${searchDate}`;
  
  debugLog(`Search parameters: before ${searchDate} (${days} days ago)`, "IMPORTANT");
  
  let totalDeleted = 0;
  let batchCount = 0;
  let retryCount = 0;
  const startTime = new Date();
  
  try {
    while (true) {
      try {
        const threads = GmailApp.search(searchQuery, 0, MAX_BATCH_SIZE);
        
        if (threads.length === 0) {
          debugLog("No more old emails found.", "IMPORTANT");
          break;
        }
        
        batchCount++;
        debugLog(`Batch ${batchCount}: Processing ${threads.length} threads`);
        
        GmailApp.moveThreadsToTrash(threads);
        totalDeleted += threads.length;
        
        debugLog(`Batch ${batchCount} completed. Total deleted: ${totalDeleted}`, "IMPORTANT");
        
        retryCount = 0;
        
        if (threads.length === MAX_BATCH_SIZE) {
          debugLog(`Waiting ${DELAY_BETWEEN_BATCHES/1000} seconds...`);
          Utilities.sleep(DELAY_BETWEEN_BATCHES);
        }
        
        if (totalDeleted >= SAFETY_LIMIT) {
          debugLog(`Reached safety limit of ${SAFETY_LIMIT} deleted threads. Stopping.`, "IMPORTANT");
          break;
        }
        
      } catch (batchError) {
        retryCount++;
        debugLog(`Batch error (attempt ${retryCount}/${MAX_RETRIES}): ${batchError.message}`, "ERROR");
        
        if (retryCount >= MAX_RETRIES) {
          throw batchError;
        }
        
        const retryDelay = DELAY_BETWEEN_BATCHES * Math.pow(2, retryCount);
        Utilities.sleep(retryDelay);
        continue;
      }
    }
  } catch (error) {
    debugLog(`Error occurred: ${error.message}`, "ERROR");
    debugLog(`Total threads deleted before error: ${totalDeleted}`, "IMPORTANT");
  }
  
  const endTime = new Date();
  const durationMinutes = Math.round((endTime - startTime) / 60000 * 100) / 100;
  
  debugLog(`=== CLEANUP SUMMARY ===`, "IMPORTANT");
  debugLog(`Total threads deleted: ${totalDeleted}`, "IMPORTANT");
  debugLog(`Process duration: ${durationMinutes} minutes`, "IMPORTANT");
}

// Function to safely empty trash with enhanced error handling
function emptyTrash() {
  debugLog("Starting permanent deletion of trashed emails", "IMPORTANT");
  
  let totalDeleted = 0;
  let batchCount = 0;
  let retryCount = 0;
  const startTime = new Date();
  
  try {
    while (true) {
      try {
        const trashedThreads = GmailApp.search("in:trash", 0, MAX_BATCH_SIZE);
        
        if (trashedThreads.length === 0) {
          debugLog("Trash is empty.", "IMPORTANT");
          break;
        }
        
        batchCount++;
        debugLog(`Batch ${batchCount}: Permanently deleting ${trashedThreads.length} threads`);
        
        // Permanently delete the threads
        for (let thread of trashedThreads) {
          thread.moveToTrash(); // This permanently deletes already trashed items
        }
        
        totalDeleted += trashedThreads.length;
        debugLog(`Batch ${batchCount} completed. Total permanently deleted: ${totalDeleted}`, "IMPORTANT");
        
        retryCount = 0;
        
        if (trashedThreads.length === MAX_BATCH_SIZE) {
          debugLog(`Waiting ${DELAY_BETWEEN_BATCHES/1000} seconds...`);
          Utilities.sleep(DELAY_BETWEEN_BATCHES);
        }
        
      } catch (batchError) {
        retryCount++;
        debugLog(`Batch error (attempt ${retryCount}/${MAX_RETRIES}): ${batchError.message}`, "ERROR");
        
        if (retryCount >= MAX_RETRIES) {
          throw batchError;
        }
        
        const retryDelay = DELAY_BETWEEN_BATCHES * Math.pow(2, retryCount);
        Utilities.sleep(retryDelay);
        continue;
      }
    }
  } catch (error) {
    debugLog(`Error emptying trash: ${error.message}`, "ERROR");
  }
  
  const endTime = new Date();
  const durationMinutes = Math.round((endTime - startTime) / 60000 * 100) / 100;
  
  debugLog(`=== TRASH CLEANUP SUMMARY ===`, "IMPORTANT");
  debugLog(`Total threads permanently deleted: ${totalDeleted}`, "IMPORTANT");
  debugLog(`Process duration: ${durationMinutes} minutes`, "IMPORTANT");
}

// Test function to check what would be deleted (dry run)
function previewOldEmails() {
  debugLog("=== DRY RUN MODE - PREVIEW ONLY ===", "IMPORTANT");
  
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const searchDate = Utilities.formatDate(twoYearsAgo, Session.getScriptTimeZone(), 'yyyy/MM/dd');
  const searchQuery = `before:${searchDate}`;
  
  debugLog(`Would delete emails before: ${searchDate}`, "IMPORTANT");
  
  try {
    // Get a sample of threads that would be deleted
    const sampleThreads = GmailApp.search(searchQuery, 0, 10);
    
    debugLog(`Sample of threads that would be deleted:`, "IMPORTANT");
    sampleThreads.forEach((thread, index) => {
      const date = thread.getLastMessageDate();
      const subject = thread.getFirstMessageSubject();
      const messageCount = thread.getMessageCount();
      debugLog(`${index + 1}. Date: ${date}, Messages: ${messageCount}, Subject: "${subject}"`, "IMPORTANT");
    });
    
    // Get total count estimate (this might take a moment for large amounts)
    debugLog("Counting total threads... (this may take a moment)", "IMPORTANT");
    let totalCount = 0;
    let batchCount = 0;
    
    while (totalCount < 1000) { // Cap the count check at 1000 to avoid timeout
      const batch = GmailApp.search(searchQuery, totalCount, 100);
      if (batch.length === 0) break;
      totalCount += batch.length;
      batchCount++;
      
      if (batchCount % 5 === 0) { // Progress update every 5 batches
        debugLog(`Counted ${totalCount} threads so far...`, "IMPORTANT");
      }
    }
    
    if (totalCount >= 1000) {
      debugLog(`Found 1000+ threads that would be deleted (stopped counting at 1000)`, "IMPORTANT");
    } else {
      debugLog(`Total threads that would be deleted: ${totalCount}`, "IMPORTANT");
    }
    
  } catch (error) {
    debugLog(`Error in preview: ${error.message}`, "ERROR");
  }
}
