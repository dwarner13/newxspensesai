# Localhost Troubleshooting Guide

## ✅ Server Status
- **Port 5173**: ✅ Running (Vite dev server)
- **Port 8888**: ⚠️ Not listening (Netlify Dev not running)

---

## 🔧 Quick Fixes

### 1. Try These URLs (in order):

1. **http://localhost:5173** (Primary - Vite dev server)
2. **http://127.0.0.1:5173** (Alternative - IP address)
3. **http://0.0.0.0:5173** (Alternative - All interfaces)

### 2. Browser-Specific Issues:

**Chrome/Edge:**
- Try incognito mode: `Ctrl+Shift+N`
- Clear cache: `Ctrl+Shift+Delete`
- Check for extensions blocking localhost

**Firefox:**
- Try private window: `Ctrl+Shift+P`
- Check `about:config` for `network.dns.localDomains`

**Safari:**
- Try private window: `Cmd+Shift+N`
- Check Develop menu → Disable Local File Restrictions

### 3. Windows-Specific Issues:

**Firewall:**
```powershell
# Check if Windows Firewall is blocking
netsh advfirewall firewall show rule name=all | findstr 5173
```

**Hosts File:**
- Check `C:\Windows\System32\drivers\etc\hosts`
- Make sure `localhost` isn't redirected

**Antivirus:**
- Temporarily disable antivirus/firewall
- Add exception for Node.js/port 5173

---

## 🚀 Start Fresh Dev Server

### Option A: Vite Only (Fast)
```bash
npm run dev
```
Then open: **http://localhost:5173**

### Option B: Netlify Dev (Full Stack)
```bash
npm run netlify:dev
```
Then open: **http://localhost:8888**

---

## 🔍 Diagnostic Commands

### Check if server is running:
```bash
netstat -ano | findstr :5173
```

### Test connection:
```bash
curl http://localhost:5173
```

### Check Node processes:
```bash
tasklist | findstr node
```

---

## 🐛 Common Issues

### Issue: "This site can't be reached"
**Solution:**
1. Verify server is running: `netstat -ano | findstr :5173`
2. Try `127.0.0.1:5173` instead of `localhost:5173`
3. Check Windows Firewall settings

### Issue: "ERR_CONNECTION_REFUSED"
**Solution:**
1. Server isn't running - start it: `npm run dev`
2. Port might be blocked - try different port
3. Check if another app is using port 5173

### Issue: Blank page / White screen
**Solution:**
1. Open browser console (F12) - check for errors
2. Check Network tab - verify files are loading
3. Try hard refresh: `Ctrl+Shift+R` or `Ctrl+F5`

### Issue: CORS errors
**Solution:**
1. Use Netlify Dev instead: `npm run netlify:dev`
2. Check `vite.config.ts` proxy settings
3. Verify API endpoints are correct

---

## 📋 Step-by-Step Debugging

1. **Verify server is running:**
   ```bash
   curl http://localhost:5173
   ```
   Should return HTML.

2. **Check browser console:**
   - Press `F12` → Console tab
   - Look for errors (red text)
   - Share any error messages

3. **Check Network tab:**
   - Press `F12` → Network tab
   - Refresh page
   - Check if files are loading (200 status)

4. **Try different browser:**
   - If Chrome doesn't work, try Firefox or Edge
   - Helps identify browser-specific issues

5. **Check Windows Firewall:**
   - Windows Security → Firewall & network protection
   - Allow Node.js through firewall

---

## 🆘 Still Not Working?

**Please share:**
1. What URL you're trying: `http://localhost:5173` or `http://127.0.0.1:5173`?
2. What error message you see (exact text)
3. Browser console errors (F12 → Console)
4. Browser you're using (Chrome, Firefox, Edge, etc.)

---

## ✅ Expected Behavior

When working correctly:
- ✅ Page loads with XspensesAI interface
- ✅ No console errors (or only warnings)
- ✅ Network tab shows files loading (200 status)
- ✅ Hot reload works when you edit files







