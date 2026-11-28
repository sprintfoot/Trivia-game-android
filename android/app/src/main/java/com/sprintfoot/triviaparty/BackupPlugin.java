package com.sprintfoot.triviaparty;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Saves a game backup (a small JSON file) somewhere that outlives the app: the phone's Downloads
 * folder, or any app the share sheet offers (Google Drive, Gmail, Files…). Restoring reads the file
 * back through the web page's ordinary file picker, so no native code is needed for that side.
 */
@CapacitorPlugin(name = "Backup")
public class BackupPlugin extends Plugin {

    @PluginMethod
    public void saveToDownloads(PluginCall call) {
        String name = call.getString("name", "trivia-party-backup.json");
        String text = call.getString("text");
        if (text == null) {
            call.reject("Nothing to save");
            return;
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            // Writing to the shared Downloads folder needs a storage permission before Android 10.
            call.reject("this needs Android 10 or newer");
            return;
        }
        try {
            ContentResolver resolver = getContext().getContentResolver();
            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
            values.put(MediaStore.MediaColumns.MIME_TYPE, "application/json");
            values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
            Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) throw new IllegalStateException("Downloads isn't available");
            try (OutputStream out = resolver.openOutputStream(uri)) {
                if (out == null) throw new IllegalStateException("couldn't open the file");
                out.write(text.getBytes(StandardCharsets.UTF_8));
            }
            // Android may add " (1)" if a file with the same name exists; report the real name.
            String saved = name;
            try (android.database.Cursor c = resolver.query(uri, new String[] { MediaStore.MediaColumns.DISPLAY_NAME }, null, null, null)) {
                if (c != null && c.moveToFirst()) saved = c.getString(0);
            }
            JSObject ret = new JSObject();
            ret.put("where", "Downloads/" + saved);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject(e.getMessage() != null ? e.getMessage() : e.toString(), e);
        }
    }

    @PluginMethod
    public void share(PluginCall call) {
        String name = call.getString("name", "trivia-party-backup.json");
        String text = call.getString("text");
        if (text == null) {
            call.reject("Nothing to share");
            return;
        }
        try {
            File dir = new File(getContext().getCacheDir(), "backup");
            if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("couldn't make a temp folder");
            File file = new File(dir, name);
            try (FileOutputStream out = new FileOutputStream(file)) {
                out.write(text.getBytes(StandardCharsets.UTF_8));
            }
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("application/json");
            send.putExtra(Intent.EXTRA_STREAM, uri);
            send.putExtra(Intent.EXTRA_SUBJECT, "Trivia Party backup");
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent chooser = Intent.createChooser(send, "Save your Trivia Party backup");
            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(chooser);
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage() != null ? e.getMessage() : e.toString(), e);
        }
    }
}
