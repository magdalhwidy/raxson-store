#!/usr/bin/env python3
# api/server.py - محاكاة PHP API في Termux

import http.server
import socketserver
import json
import os
import time
from urllib.parse import parse_qs, urlparse

PORT = 3000
DATA_DIR = os.path.dirname(os.path.abspath(__file__))
USERS_FILE = os.path.join(DATA_DIR, 'users.json')

class APIHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        
        # API Endpoints
        if path == '/api/session.php':
            self._handle_session()
            return
        elif path == '/api/logout.php':
            self._handle_logout()
            return
        elif path == '/api/load_users.php':
            self._handle_load_users()
            return
        elif path.startswith('/api/employees.php'):
            self._handle_employees(parsed.query)
            return
            
        # Serve static files
        super().do_GET()
    
    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        
        if path == '/api/login.php':
            self._handle_login()
            return
        elif path == '/api/save_users.php':
            self._handle_save_users()
            return
            
        super().do_POST()
    
    def do_HEAD(self):
        parsed = urlparse(self.path)
        path = parsed.path
        
        if path in ['/api/session.php', '/api/login.php', '/api/logout.php', 
                    '/api/load_users.php', '/api/save_users.php']:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            return
            
        super().do_HEAD()
    
    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
    
    def _read_users(self):
        try:
            with open(USERS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {"admin": None, "employees": [], "login_history": []}
    
    def _handle_session(self):
        # في Termux: نُرجع دائماً Not authenticated
        # لأننا لا نملك PHP sessions
        self._send_json({
            "success": False,
            "error": "Not authenticated"
        }, 401)
    
    def _handle_logout(self):
        self._send_json({"success": True})
    
    def _handle_login(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        data = json.loads(body.decode('utf-8'))
        
        username = data.get('username', '')
        password = data.get('password', '')
        
        users = self._read_users()
        
        # Check admin
        if users.get('admin') and users['admin']['username'] == username:
            if users['admin']['password'] == password:
                if users['admin'].get('active') == False:
                    self._send_json({
                        "success": False,
                        "error": "الحساب معطل"
                    })
                    return
                
                # Update last login
                users['admin']['last_login'] = time.strftime('%Y-%m-%dT%H:%M:%S')
                with open(USERS_FILE, 'w', encoding='utf-8') as f:
                    json.dump(users, f, ensure_ascii=False, indent=2)
                
                self._send_json({
                    "success": True,
                    "user": {
                        "id": users['admin']['id'],
                        "username": users['admin']['username'],
                        "name": users['admin']['name'],
                        "role": "admin",
                        "permissions": users['admin'].get('permissions', {})
                    },
                    "redirect": "dashboard.html"
                })
                return
        
        # Check employees
        for emp in users.get('employees', []):
            if (emp['username'] == username and 
                emp['password'] == password and
                emp.get('approved') == True and
                emp.get('active') != False):
                
                self._send_json({
                    "success": True,
                    "user": {
                        "id": emp['id'],
                        "username": emp['username'],
                        "name": emp['name'],
                        "role": "employee",
                        "permissions": emp.get('permissions', {})
                    },
                    "redirect": "orders.html"
                })
                return
        
        self._send_json({
            "success": False,
            "error": "اسم المستخدم أو كلمة المرور غير صحيحة"
        })
    
    def _handle_load_users(self):
        users = self._read_users()
        self._send_json(users)
    
    def _handle_save_users(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        data = json.loads(body.decode('utf-8'))
        
        with open(USERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        self._send_json({"success": True})
    
    def _handle_employees(self, query):
        # TODO: Implement employee CRUD
        self._send_json({"success": True, "employees": []})

# Change to project root
os.chdir(os.path.dirname(DATA_DIR))

with socketserver.TCPServer(("0.0.0.0", PORT), APIHandler) as httpd:
    print(f"Serving at port {PORT}")
    print(f"Open: http://localhost:{PORT}/admin/login.html")
    httpd.serve_forever()
