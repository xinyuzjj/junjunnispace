#!/usr/bin/env python3
import json
import os
import tkinter as tk
from tkinter import ttk, messagebox, filedialog

DATA_FILE = os.path.join(os.path.dirname(__file__), 'public', 'share-resources.json')

class ResourceManager:
    def __init__(self):
        self.window = tk.Tk()
        self.window.title("📦 资源管理工具")
        self.window.geometry("900x650")
        self.window.configure(bg="#f5f5f5")

        self.categories = []
        self.load_data()
        self.create_ui()

    def load_data(self):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                self.data = json.load(f)
                self.categories = self.data.get('categories', [])
                self.resources = self.data.get('resources', [])
            
            if not self.categories:
                self.categories = [
                    {"id": "study", "name": "学习资源", "icon": "📚", "color": "blue"},
                    {"id": "ai", "name": "AI资源", "icon": "🤖", "color": "purple"},
                    {"id": "game", "name": "游戏资源", "icon": "🎮", "color": "green"},
                    {"id": "crack", "name": "破解软件", "icon": "🔓", "color": "red"}
                ]
                self.data['categories'] = self.categories
                self.save_data()
                
        except Exception as e:
            messagebox.showerror("错误", f"加载数据失败: {e}")
            self.categories = [
                {"id": "study", "name": "学习资源", "icon": "📚", "color": "blue"},
                {"id": "ai", "name": "AI资源", "icon": "🤖", "color": "purple"},
                {"id": "game", "name": "游戏资源", "icon": "🎮", "color": "green"},
                {"id": "crack", "name": "破解软件", "icon": "🔓", "color": "red"}
            ]
            self.resources = []
            self.data = {"categories": self.categories, "resources": self.resources}

    def save_data(self):
        try:
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            messagebox.showerror("错误", f"保存数据失败: {e}")
            return False

    def create_ui(self):
        title_frame = tk.Frame(self.window, bg="#e74c3c", pady=10)
        title_frame.pack(fill=tk.X)

        title_label = tk.Label(title_frame, text="📦 资源管理工具", font=("Microsoft YaHei", 18, "bold"),
                              fg="white", bg="#e74c3c")
        title_label.pack()

        main_frame = tk.Frame(self.window, bg="#f5f5f5")
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        left_frame = tk.Frame(main_frame, bg="white", width=350)
        left_frame.pack(side=tk.LEFT, fill=tk.BOTH, padx=(0, 5))

        tk.Label(left_frame, text="➕ 添加资源", font=("Microsoft YaHei", 12, "bold"),
                bg="white").pack(pady=(10, 5))

        form_frame = tk.Frame(left_frame, bg="white")
        form_frame.pack(fill=tk.X, padx=10, pady=5)

        tk.Label(form_frame, text="标题:", bg="white", anchor="w").pack(fill=tk.X)
        self.title_entry = tk.Entry(form_frame, font=("Microsoft YaHei", 10))
        self.title_entry.pack(fill=tk.X, pady=(0, 10))

        tk.Label(form_frame, text="描述:", bg="white", anchor="w").pack(fill=tk.X)
        self.desc_text = tk.Text(form_frame, font=("Microsoft YaHei", 10), height=3)
        self.desc_text.pack(fill=tk.X, pady=(0, 10))

        tk.Label(form_frame, text="分类:", bg="white", anchor="w").pack(fill=tk.X)
        self.category_var = tk.StringVar()
        category_names = [f"{cat['icon']} {cat['name']}" for cat in self.categories]
        self.category_combo = ttk.Combobox(form_frame, textvariable=self.category_var,
                                          values=category_names, state="readonly")
        if category_names:
            self.category_combo.current(0)
        self.category_combo.pack(fill=tk.X, pady=(0, 10))

        tk.Label(form_frame, text="标签（用逗号分隔）:", bg="white", anchor="w").pack(fill=tk.X)
        self.tags_entry = tk.Entry(form_frame, font=("Microsoft YaHei", 10))
        self.tags_entry.pack(fill=tk.X, pady=(0, 10))

        tk.Label(form_frame, text="夸克网盘链接:", bg="white", anchor="w").pack(fill=tk.X)
        self.quark_entry = tk.Entry(form_frame, font=("Microsoft YaHei", 10))
        self.quark_entry.pack(fill=tk.X, pady=(0, 10))

        tk.Label(form_frame, text="百度网盘链接:", bg="white", anchor="w").pack(fill=tk.X)
        self.baidu_entry = tk.Entry(form_frame, font=("Microsoft YaHei", 10))
        self.baidu_entry.pack(fill=tk.X, pady=(0, 10))

        btn_frame = tk.Frame(left_frame, bg="white")
        btn_frame.pack(pady=10)

        add_btn = tk.Button(btn_frame, text="✨ 添加资源", command=self.add_resource,
                          bg="#27ae60", fg="white", font=("Microsoft YaHei", 11, "bold"),
                          padx=20, pady=5, cursor="hand2")
        add_btn.pack(side=tk.LEFT, padx=5)

        clear_btn = tk.Button(btn_frame, text="🗑️ 清空", command=self.clear_form,
                             bg="#95a5a6", fg="white", font=("Microsoft YaHei", 11),
                             padx=20, pady=5, cursor="hand2")
        clear_btn.pack(side=tk.LEFT, padx=5)

        right_frame = tk.Frame(main_frame, bg="white")
        right_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(5, 0))

        search_frame = tk.Frame(right_frame, bg="white")
        search_frame.pack(fill=tk.X, pady=10)

        tk.Label(search_frame, text="🔍 搜索:", bg="white").pack(side=tk.LEFT, padx=5)
        self.search_entry = tk.Entry(search_frame, font=("Microsoft YaHei", 10), width=30)
        self.search_entry.pack(side=tk.LEFT, padx=5)
        self.search_entry.bind("<KeyRelease>", lambda e: self.refresh_list())

        self.filter_var = tk.StringVar(value="all")
        filter_frame = tk.Frame(right_frame, bg="white")
        filter_frame.pack(fill=tk.X, padx=10, pady=(0, 10))

        tk.Label(filter_frame, text="筛选:", bg="white").pack(side=tk.LEFT, padx=(0, 5))

        all_btn = tk.Radiobutton(filter_frame, text="📁 全部", variable=self.filter_var,
                                value="all", command=self.refresh_list,
                                bg="white", cursor="hand2")
        all_btn.pack(side=tk.LEFT, padx=2)

        for cat in self.categories:
            btn = tk.Radiobutton(filter_frame, text=f"{cat['icon']} {cat['name']}",
                                variable=self.filter_var, value=cat['id'],
                                command=self.refresh_list, bg="white", cursor="hand2")
            btn.pack(side=tk.LEFT, padx=2)

        list_frame = tk.Frame(right_frame, bg="white")
        list_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=(0, 10))

        columns = ("ID", "标题", "分类", "标签")
        self.tree = ttk.Treeview(list_frame, columns=columns, show="headings", height=20)

        self.tree.heading("ID", text="ID")
        self.tree.heading("标题", text="标题")
        self.tree.heading("分类", text="分类")
        self.tree.heading("标签", text="标签")

        self.tree.column("ID", width=50, anchor="center")
        self.tree.column("标题", width=250)
        self.tree.column("分类", width=100, anchor="center")
        self.tree.column("标签", width=150)

        scrollbar = ttk.Scrollbar(list_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)

        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        self.tree.bind("<Double-1>", self.on_item_double_click)

        bottom_frame = tk.Frame(right_frame, bg="white")
        bottom_frame.pack(fill=tk.X, pady=5)

        self.count_label = tk.Label(bottom_frame, text=f"共 {len(self.resources)} 条资源",
                bg="white", fg="#666")
        self.count_label.pack(side=tk.LEFT, padx=10)

        delete_btn = tk.Button(bottom_frame, text="🗑️ 删除选中", command=self.delete_resource,
                              bg="#e74c3c", fg="white", font=("Microsoft YaHei", 10),
                              padx=15, cursor="hand2")
        delete_btn.pack(side=tk.RIGHT, padx=5)

        refresh_btn = tk.Button(bottom_frame, text="🔄 刷新", command=self.refresh_list,
                              bg="#3498db", fg="white", font=("Microsoft YaHei", 10),
                              padx=15, cursor="hand2")
        refresh_btn.pack(side=tk.RIGHT, padx=5)

        self.refresh_list()

    def refresh_list(self):
        for item in self.tree.get_children():
            self.tree.delete(item)

        search_term = self.search_entry.get().lower()
        filter_cat = self.filter_var.get()

        filtered = self.resources
        if filter_cat != "all":
            filtered = [r for r in filtered if r.get('category') == filter_cat]
        if search_term:
            filtered = [r for r in filtered if
                       search_term in r.get('title', '').lower() or
                       search_term in r.get('desc', '').lower() or
                       any(search_term in tag.lower() for tag in r.get('tags', []))]

        for resource in filtered:
            cat = next((c for c in self.categories if c['id'] == resource.get('category')), None)
            cat_name = f"{cat['icon']} {cat['name']}" if cat else "-"
            tags = ", ".join(resource.get('tags', []))

            self.tree.insert("", tk.END, values=(
                resource.get('id', ''),
                resource.get('title', ''),
                cat_name,
                tags
            ))

        self.tree.tag_configure('even', background='#f9f9f9')
        for i, item in enumerate(self.tree.get_children()):
            if i % 2 == 0:
                self.tree.item(item, tags=('even',))

        self.count_label.config(text=f"共 {len(self.resources)} 条资源")

    def add_resource(self):
        title = self.title_entry.get().strip()
        desc = self.desc_text.get("1.0", tk.END).strip()

        if not title:
            messagebox.showwarning("提示", "请输入资源标题")
            return

        if not desc:
            messagebox.showwarning("提示", "请输入资源描述")
            return

        cat_index = self.category_combo.current()
        if cat_index >= 0 and cat_index < len(self.categories):
            category = self.categories[cat_index]['id']
        else:
            messagebox.showwarning("提示", "请选择分类")
            return

        tags_text = self.tags_entry.get().strip()
        tags = [t.strip() for t in tags_text.split(',') if t.strip()] if tags_text else []

        quark = self.quark_entry.get().strip()
        baidu = self.baidu_entry.get().strip()

        if self.resources:
            new_id = str(max(int(r['id']) for r in self.resources) + 1)
        else:
            new_id = "1"

        new_resource = {
            "id": new_id,
            "category": category,
            "title": title,
            "desc": desc,
        }

        if tags:
            new_resource["tags"] = tags
        if quark:
            new_resource["quarkLink"] = quark
        if baidu:
            new_resource["baiduLink"] = baidu

        self.data['resources'].insert(0, new_resource)
        self.resources = self.data['resources']

        if self.save_data():
            messagebox.showinfo("成功", f"✅ 资源添加成功！\n\nID: {new_id}\n标题: {title}")
            self.clear_form()
            self.refresh_list()

    def clear_form(self):
        self.title_entry.delete(0, tk.END)
        self.desc_text.delete("1.0", tk.END)
        self.category_combo.current(0)
        self.tags_entry.delete(0, tk.END)
        self.quark_entry.delete(0, tk.END)
        self.baidu_entry.delete(0, tk.END)

    def on_item_double_click(self, event):
        item = self.tree.selection()
        if not item:
            return

        item = item[0]
        values = self.tree.item(item, "values")
        resource_id = values[0]

        for resource in self.resources:
            if resource['id'] == resource_id:
                self.title_entry.delete(0, tk.END)
                self.title_entry.insert(0, resource.get('title', ''))

                self.desc_text.delete("1.0", tk.END)
                self.desc_text.insert("1.0", resource.get('desc', ''))

                cat_id = resource.get('category', '')
                for i, cat in enumerate(self.categories):
                    if cat['id'] == cat_id:
                        self.category_combo.current(i)
                        break

                self.tags_entry.delete(0, tk.END)
                self.tags_entry.insert(0, ', '.join(resource.get('tags', [])))

                self.quark_entry.delete(0, tk.END)
                self.quark_entry.insert(0, resource.get('quarkLink', ''))

                self.baidu_entry.delete(0, tk.END)
                self.baidu_entry.insert(0, resource.get('baiduLink', ''))

                messagebox.showinfo("编辑提示", "已加载资源信息到表单，请修改后点击「添加资源」按钮保存")
                break

    def delete_resource(self):
        selected = self.tree.selection()
        if not selected:
            messagebox.showwarning("提示", "请先选择要删除的资源\n\n💡 点击列表中的任意一行来选中它")
            return

        item = selected[0]
        values = self.tree.item(item, "values")
        resource_id = values[0]
        resource_title = values[1]

        confirm = messagebox.askyesno("确认删除", f"确定要删除资源「{resource_title}」吗？\n\n此操作不可恢复！")
        if not confirm:
            return

        original_len = len(self.resources)
        self.data['resources'] = [r for r in self.resources if r['id'] != resource_id]

        if len(self.data['resources']) < original_len:
            self.resources = self.data['resources']
            if self.save_data():
                messagebox.showinfo("成功", f"✅ 资源「{resource_title}」已删除")
                self.refresh_list()
        else:
            messagebox.showerror("错误", "❌ 未找到该资源")

    def run(self):
        self.window.mainloop()

if __name__ == '__main__':
    app = ResourceManager()
    app.run()
