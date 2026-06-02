#!/usr/bin/env python3
import json
import os
import tkinter as tk
from tkinter import ttk, messagebox

DATA_FILE = os.path.join(os.path.dirname(__file__), 'public', 'resources.json')

class HomeResourceManager:
    def __init__(self):
        self.window = tk.Tk()
        self.window.title("🏠 主页资源管理工具")
        self.window.geometry("950x700")
        self.window.configure(bg="#f5f5f5")

        self.resources = []
        self.load_data()
        self.create_ui()

    def load_data(self):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                self.resources = json.load(f)
        except Exception as e:
            messagebox.showerror("错误", f"加载数据失败: {e}")
            self.resources = []

    def save_data(self):
        try:
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.resources, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            messagebox.showerror("错误", f"保存数据失败: {e}")
            return False

    def create_ui(self):
        title_frame = tk.Frame(self.window, bg="#e74c3c", pady=10)
        title_frame.pack(fill=tk.X)

        title_label = tk.Label(title_frame, text="🏠 主页资源管理工具", font=("Microsoft YaHei", 18, "bold"),
                              fg="white", bg="#e74c3c")
        title_label.pack()

        main_frame = tk.Frame(self.window, bg="#f5f5f5")
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        left_frame = tk.Frame(main_frame, bg="white", width=380)
        left_frame.pack(side=tk.LEFT, fill=tk.BOTH, padx=(0, 5))

        tk.Label(left_frame, text="➕ 添加/编辑资源", font=("Microsoft YaHei", 12, "bold"),
                bg="white").pack(pady=(10, 5))

        form_frame = tk.Frame(left_frame, bg="white")
        form_frame.pack(fill=tk.X, padx=10, pady=5)

        tk.Label(form_frame, text="ID:", bg="white", anchor="w").pack(fill=tk.X)
        self.id_entry = tk.Entry(form_frame, font=("Microsoft YaHei", 10))
        self.id_entry.pack(fill=tk.X, pady=(0, 10))

        tk.Label(form_frame, text="标题:", bg="white", anchor="w").pack(fill=tk.X)
        self.title_entry = tk.Entry(form_frame, font=("Microsoft YaHei", 10))
        self.title_entry.pack(fill=tk.X, pady=(0, 10))

        tk.Label(form_frame, text="描述:", bg="white", anchor="w").pack(fill=tk.X)
        self.desc_text = tk.Text(form_frame, font=("Microsoft YaHei", 10), height=4)
        self.desc_text.pack(fill=tk.X, pady=(0, 10))

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
                          padx=15, pady=5, cursor="hand2")
        add_btn.pack(side=tk.LEFT, padx=3)

        update_btn = tk.Button(btn_frame, text="💾 更新", command=self.update_resource,
                              bg="#3498db", fg="white", font=("Microsoft YaHei", 11, "bold"),
                              padx=15, pady=5, cursor="hand2")
        update_btn.pack(side=tk.LEFT, padx=3)

        clear_btn = tk.Button(btn_frame, text="🗑️ 清空", command=self.clear_form,
                             bg="#95a5a6", fg="white", font=("Microsoft YaHei", 11),
                             padx=15, pady=5, cursor="hand2")
        clear_btn.pack(side=tk.LEFT, padx=3)

        right_frame = tk.Frame(main_frame, bg="white")
        right_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(5, 0))

        search_frame = tk.Frame(right_frame, bg="white")
        search_frame.pack(fill=tk.X, pady=10)

        tk.Label(search_frame, text="🔍 搜索:", bg="white").pack(side=tk.LEFT, padx=5)
        self.search_entry = tk.Entry(search_frame, font=("Microsoft YaHei", 10), width=35)
        self.search_entry.pack(side=tk.LEFT, padx=5)
        self.search_entry.bind("<KeyRelease>", lambda e: self.refresh_list())

        list_frame = tk.Frame(right_frame, bg="white")
        list_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=(0, 10))

        columns = ("ID", "标题", "描述", "标签")
        self.tree = ttk.Treeview(list_frame, columns=columns, show="headings", height=22)

        self.tree.heading("ID", text="ID")
        self.tree.heading("标题", text="标题")
        self.tree.heading("描述", text="描述")
        self.tree.heading("标签", text="标签")

        self.tree.column("ID", width=50, anchor="center")
        self.tree.column("标题", width=200)
        self.tree.column("描述", width=250)
        self.tree.column("标签", width=150)

        scrollbar = ttk.Scrollbar(list_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)

        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        self.tree.bind("<Double-1>", self.on_item_double_click)
        self.tree.bind("<Button-1>", self.on_item_click)

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

        sort_btn = tk.Button(bottom_frame, text="📊 按ID排序", command=self.sort_by_id,
                             bg="#9b59b6", fg="white", font=("Microsoft YaHei", 10),
                             padx=15, cursor="hand2")
        sort_btn.pack(side=tk.RIGHT, padx=5)

        self.refresh_list()

    def refresh_list(self):
        for item in self.tree.get_children():
            self.tree.delete(item)

        search_term = self.search_entry.get().lower()

        filtered = self.resources
        if search_term:
            filtered = [r for r in filtered if
                       search_term in r.get('title', '').lower() or
                       search_term in r.get('desc', '').lower() or
                       any(search_term in tag.lower() for tag in r.get('tags', []))]

        for resource in filtered:
            tags = ", ".join(resource.get('tags', []))
            desc = resource.get('desc', '')
            if len(desc) > 30:
                desc = desc[:30] + "..."

            self.tree.insert("", tk.END, values=(
                resource.get('id', ''),
                resource.get('title', ''),
                desc,
                tags
            ))

        self.tree.tag_configure('even', background='#f9f9f9')
        for i, item in enumerate(self.tree.get_children()):
            if i % 2 == 0:
                self.tree.item(item, tags=('even',))

        self.count_label.config(text=f"共 {len(self.resources)} 条资源")

    def add_resource(self):
        id_val = self.id_entry.get().strip()
        title = self.title_entry.get().strip()
        desc = self.desc_text.get("1.0", tk.END).strip()

        if not id_val:
            messagebox.showwarning("提示", "请输入资源ID")
            return

        if not title:
            messagebox.showwarning("提示", "请输入资源标题")
            return

        if not desc:
            messagebox.showwarning("提示", "请输入资源描述")
            return

        if any(r['id'] == id_val for r in self.resources):
            messagebox.showwarning("提示", f"ID {id_val} 已存在，请使用更新功能或更换ID")
            return

        tags_text = self.tags_entry.get().strip()
        tags = [t.strip() for t in tags_text.split(',') if t.strip()] if tags_text else []

        quark = self.quark_entry.get().strip()
        baidu = self.baidu_entry.get().strip()

        new_resource = {
            "id": id_val,
            "title": title,
            "desc": desc,
        }

        if tags:
            new_resource["tags"] = tags
        if quark:
            new_resource["quarkLink"] = quark
        if baidu:
            new_resource["baiduLink"] = baidu

        self.resources.insert(0, new_resource)

        if self.save_data():
            messagebox.showinfo("成功", f"✅ 资源添加成功！\n\nID: {id_val}\n标题: {title}")
            self.clear_form()
            self.refresh_list()

    def update_resource(self):
        selected = self.tree.selection()
        if not selected:
            messagebox.showwarning("提示", "请先在列表中选择要更新的资源\n\n💡 双击列表中的任意一行来选中并编辑")
            return

        item = selected[0]
        values = self.tree.item(item, "values")
        old_id = values[0]

        id_val = self.id_entry.get().strip()
        title = self.title_entry.get().strip()
        desc = self.desc_text.get("1.0", tk.END).strip()

        if not id_val:
            messagebox.showwarning("提示", "请输入资源ID")
            return

        if not title:
            messagebox.showwarning("提示", "请输入资源标题")
            return

        if not desc:
            messagebox.showwarning("提示", "请输入资源描述")
            return

        if id_val != old_id and any(r['id'] == id_val for r in self.resources):
            messagebox.showwarning("提示", f"ID {id_val} 已存在")
            return

        tags_text = self.tags_entry.get().strip()
        tags = [t.strip() for t in tags_text.split(',') if t.strip()] if tags_text else []

        quark = self.quark_entry.get().strip()
        baidu = self.baidu_entry.get().strip()

        for resource in self.resources:
            if resource['id'] == old_id:
                resource['id'] = id_val
                resource['title'] = title
                resource['desc'] = desc
                resource['tags'] = tags if tags else []
                if quark:
                    resource['quarkLink'] = quark
                if baidu:
                    resource['baiduLink'] = baidu
                break

        if self.save_data():
            messagebox.showinfo("成功", f"✅ 资源更新成功！\n\nID: {id_val}\n标题: {title}")
            self.clear_form()
            self.refresh_list()

    def clear_form(self):
        self.id_entry.delete(0, tk.END)
        self.title_entry.delete(0, tk.END)
        self.desc_text.delete("1.0", tk.END)
        self.tags_entry.delete(0, tk.END)
        self.quark_entry.delete(0, tk.END)
        self.baidu_entry.delete(0, tk.END)

    def on_item_click(self, event):
        pass

    def on_item_double_click(self, event):
        item = self.tree.selection()
        if not item:
            return

        item = item[0]
        values = self.tree.item(item, "values")
        resource_id = values[0]

        for resource in self.resources:
            if resource['id'] == resource_id:
                self.id_entry.delete(0, tk.END)
                self.id_entry.insert(0, resource.get('id', ''))

                self.title_entry.delete(0, tk.END)
                self.title_entry.insert(0, resource.get('title', ''))

                self.desc_text.delete("1.0", tk.END)
                self.desc_text.insert("1.0", resource.get('desc', ''))

                self.tags_entry.delete(0, tk.END)
                self.tags_entry.insert(0, ', '.join(resource.get('tags', [])))

                self.quark_entry.delete(0, tk.END)
                self.quark_entry.insert(0, resource.get('quarkLink', ''))

                self.baidu_entry.delete(0, tk.END)
                self.baidu_entry.insert(0, resource.get('baiduLink', ''))

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
        self.resources = [r for r in self.resources if r['id'] != resource_id]

        if len(self.resources) < original_len:
            if self.save_data():
                messagebox.showinfo("成功", f"✅ 资源「{resource_title}」已删除")
                self.clear_form()
                self.refresh_list()
        else:
            messagebox.showerror("错误", "❌ 未找到该资源")

    def sort_by_id(self):
        try:
            self.resources.sort(key=lambda x: int(x['id']), reverse=True)
            if self.save_data():
                messagebox.showinfo("成功", "✅ 已按ID降序排列")
                self.refresh_list()
        except ValueError:
            messagebox.showerror("错误", "❌ ID必须是数字")

    def run(self):
        self.window.mainloop()

if __name__ == '__main__':
    app = HomeResourceManager()
    app.run()
