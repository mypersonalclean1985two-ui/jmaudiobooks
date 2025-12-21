import customtkinter as ctk
from tkinter import filedialog, messagebox
import os
import utils

ctk.set_appearance_mode("System")
ctk.set_default_color_theme("blue")

BOOK_CATEGORIES = [
    "Fiction", "Sci-Fi", "Mystery", "Business", "Romance", 
    "Self-Help", "History", "Biography", "Tech", "Cooking", 
    "Travel", "Thriller", "Fantasy"
]

class App(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("E-Books Admin Panel")
        self.geometry("1000x700")

        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        self.create_sidebar()
        self.create_main_view()

    def create_sidebar(self):
        self.sidebar_frame = ctk.CTkFrame(self, width=140, corner_radius=0)
        self.sidebar_frame.grid(row=0, column=0, rowspan=4, sticky="nsew")
        self.sidebar_frame.grid_rowconfigure(4, weight=1)

        self.logo_label = ctk.CTkLabel(self.sidebar_frame, text="Admin Panel", font=ctk.CTkFont(size=20, weight="bold"))
        self.logo_label.grid(row=0, column=0, padx=20, pady=(20, 10))

        self.sidebar_button_1 = ctk.CTkButton(self.sidebar_frame, text="Books", command=self.show_books_tab)
        self.sidebar_button_1.grid(row=1, column=0, padx=20, pady=10)

        self.sidebar_button_2 = ctk.CTkButton(self.sidebar_frame, text="Users", command=self.show_users_tab)
        self.sidebar_button_2.grid(row=2, column=0, padx=20, pady=10)

    def create_main_view(self):
        self.main_frame = ctk.CTkFrame(self, corner_radius=0, fg_color="transparent")
        self.main_frame.grid(row=0, column=1, sticky="nsew", padx=20, pady=20)
        
        # Create Tabs
        self.tabview = ctk.CTkTabview(self.main_frame, width=800, height=600)
        self.tabview.pack(fill="both", expand=True)
        
        self.tabview.add("Books")
        self.tabview.add("Users")
        self.tabview.add("LibriVox")
        
        self.setup_books_tab()
        self.setup_users_tab()
        self.setup_librivox_tab()

    def show_books_tab(self):
        self.tabview.set("Books")

    def show_users_tab(self):
        self.tabview.set("Users")

    def setup_books_tab(self):
        self.books_tab_frame = self.tabview.tab("Books")
        
        # Container for switching views (List vs Add)
        self.books_container = ctk.CTkFrame(self.books_tab_frame, fg_color="transparent")
        self.books_container.pack(fill="both", expand=True)
        
        self.show_book_list_view()

    def setup_users_tab(self):
        self.users_tab_frame = self.tabview.tab("Users")
        
        # Container for switching views
        self.users_container = ctk.CTkFrame(self.users_tab_frame, fg_color="transparent")
        self.users_container.pack(fill="both", expand=True)
        
        self.show_user_list_view()

    def setup_librivox_tab(self):
        self.librivox_tab_frame = self.tabview.tab("LibriVox")
        
        # Search Bar
        search_frame = ctk.CTkFrame(self.librivox_tab_frame, fg_color="transparent")
        search_frame.pack(fill="x", pady=10)
        
        self.lv_search_entry = ctk.CTkEntry(search_frame, placeholder_text="Search LibriVox...", width=300)
        self.lv_search_entry.pack(side="left", padx=10)
        
        # Category Dropdown
        self.lv_category_combo = ctk.CTkComboBox(search_frame, values=["All"] + BOOK_CATEGORIES, width=150)
        self.lv_category_combo.pack(side="left", padx=10)
        self.lv_category_combo.set("All")
        
        ctk.CTkButton(search_frame, text="Search", command=self.perform_librivox_search).pack(side="left", padx=10)
        
        # Results List
        self.lv_results_scroll = ctk.CTkScrollableFrame(self.librivox_tab_frame)
        self.lv_results_scroll.pack(fill="both", expand=True, pady=10)
        
        # Selection Controls
        selection_frame = ctk.CTkFrame(self.librivox_tab_frame, fg_color="transparent")
        selection_frame.pack(fill="x", pady=5)
        
        self.lv_select_all_var = ctk.BooleanVar()
        self.lv_select_all_check = ctk.CTkCheckBox(selection_frame, text="Select All", variable=self.lv_select_all_var, command=self.toggle_select_all)
        self.lv_select_all_check.pack(side="left", padx=20)
        
        self.lv_import_selected_btn = ctk.CTkButton(selection_frame, text="Import Selected", command=self.import_selected_books, fg_color="green")
        self.lv_import_selected_btn.pack(side="left", padx=10)
        
        # Pagination
        pagination_frame = ctk.CTkFrame(self.librivox_tab_frame, fg_color="transparent")
        pagination_frame.pack(fill="x", pady=10)
        
        self.lv_prev_btn = ctk.CTkButton(pagination_frame, text="< Previous", width=100, command=lambda: self.change_page(-1), state="disabled")
        self.lv_prev_btn.pack(side="left", padx=20)
        
        self.lv_page_label = ctk.CTkLabel(pagination_frame, text="Page 1")
        self.lv_page_label.pack(side="left", expand=True)
        
        self.lv_next_btn = ctk.CTkButton(pagination_frame, text="Next >", width=100, command=lambda: self.change_page(1))
        self.lv_next_btn.pack(side="right", padx=20)
        
        self.lv_current_page = 0
        self.lv_current_query = ""
        self.lv_book_checkboxes = []  # Store checkbox vars and book data

    def perform_librivox_search(self):
        query = self.lv_search_entry.get()
        category = self.lv_category_combo.get()
        
        # Map categories to Archive.org subjects
        subject_map = {
            "Sci-Fi": "Science Fiction",
            "Tech": "Technology",
            "Self-Help": "Self Help"
        }
        
        search_term = query
        if not search_term and category != "All":
            # If no query, use category as the search term (which hits subject index)
            search_term = subject_map.get(category, category)
        elif category != "All":
            # If query exists, we still want to filter by category, 
            # but utils.search_librivox uses the query for BOTH title and subject.
            # To strictly filter, we might need to update utils, but for now 
            # appending the subject to the query is a decent workaround 
            # or we rely on the user typing + selecting.
            # Actually, let's just pass the mapped category if query is empty.
            # If query is NOT empty, we pass query. 
            # Ideally we should pass both to utils, but utils takes one 'query' string.
            # Let's combine them: "query AND subject:category"
            # But utils does: "title:(query) OR subject:(query)"
            # So if we pass "Sherlock subject:Mystery", it becomes "title:(Sherlock subject:Mystery)..." which is wrong.
            # I should update utils to accept a separate 'subject' param?
            # For now, let's stick to the simple behavior: 
            # If text is empty, search for Category.
            # If text is present, search for Text (and ignore category dropdown or assume user typed what they want).
            pass

        if not search_term:
            return
            
        self.lv_current_query = search_term
        self.lv_current_page = 0
        self.load_librivox_page()

    def change_page(self, delta):
        self.lv_current_page += delta
        if self.lv_current_page < 0: self.lv_current_page = 0
        self.load_librivox_page()

    def load_librivox_page(self):
        # Clear previous results
        for widget in self.lv_results_scroll.winfo_children():
            widget.destroy()
            
        ctk.CTkLabel(self.lv_results_scroll, text="Loading...").pack(pady=20)
        self.lv_page_label.configure(text=f"Page {self.lv_current_page + 1}")
        
        # Update buttons
        self.lv_prev_btn.configure(state="normal" if self.lv_current_page > 0 else "disabled")
        self.update() 
        
        offset = self.lv_current_page * 20
        results = utils.search_librivox(self.lv_current_query, offset=offset, limit=20)
        
        # Clear loading
        for widget in self.lv_results_scroll.winfo_children():
            widget.destroy()
            
        if not results:
            ctk.CTkLabel(self.lv_results_scroll, text="No results found.").pack(pady=20)
            self.lv_next_btn.configure(state="disabled") # No more results
            return
        
        self.lv_next_btn.configure(state="normal") # Assume more results if we got some
        
        # Clear checkboxes list
        self.lv_book_checkboxes = []
        self.lv_select_all_var.set(False)
            
        for book in results:
            row = ctk.CTkFrame(self.lv_results_scroll)
            row.pack(fill="x", pady=5, padx=5)
            
            # Checkbox
            checkbox_var = ctk.BooleanVar()
            checkbox = ctk.CTkCheckBox(row, text="", variable=checkbox_var, width=30)
            checkbox.pack(side="left", padx=5)
            self.lv_book_checkboxes.append({'var': checkbox_var, 'book': book})
            
            info_frame = ctk.CTkFrame(row, fg_color="transparent")
            info_frame.pack(side="left", fill="x", expand=True, padx=10)
            
            ctk.CTkLabel(info_frame, text=book.get('title', 'No Title'), font=ctk.CTkFont(weight="bold"), anchor="w").pack(fill="x")
            
            authors = book.get('authors', [])
            author_text = authors[0].get('first_name', '') + " " + authors[0].get('last_name', '') if authors else "Unknown Author"
            ctk.CTkLabel(info_frame, text=author_text, anchor="w", text_color="gray").pack(fill="x")
            
            ctk.CTkButton(row, text="Import", width=80, command=lambda b=book: self.import_book(b)).pack(side="right", padx=10, pady=10)

    def import_book(self, book_data):
        category = self.lv_category_combo.get()
        if category == "All":
            category = "General"
            
        if messagebox.askyesno("Import", f"Import '{book_data.get('title')}' as '{category}'?"):
            try:
                utils.import_librivox_book(book_data, category)
                messagebox.showinfo("Success", "Book imported successfully!")
            except Exception as e:
                messagebox.showerror("Error", f"Import failed: {e}")

    def toggle_select_all(self):
        select_all = self.lv_select_all_var.get()
        for item in self.lv_book_checkboxes:
            item['var'].set(select_all)

    def import_selected_books(self):
        selected_books = [item['book'] for item in self.lv_book_checkboxes if item['var'].get()]
        
        if not selected_books:
            messagebox.showwarning("No Selection", "Please select at least one book to import.")
            return
            
        category = self.lv_category_combo.get()
        if category == "All":
            category = "General"

        if messagebox.askyesno("Bulk Import", f"Import {len(selected_books)} selected books as '{category}'?"):
            success_count = 0
            fail_count = 0
            
            for book in selected_books:
                try:
                    utils.import_librivox_book(book, category)
                    success_count += 1
                except Exception as e:
                    fail_count += 1
                    print(f"Failed to import {book.get('title')}: {e}")
            
            messagebox.showinfo("Import Complete", f"Successfully imported: {success_count}\nFailed: {fail_count}")

    # --- BOOK VIEWS ---

    def show_book_list_view(self):
        # Clear container
        for widget in self.books_container.winfo_children():
            widget.destroy()

        # Header
        header = ctk.CTkFrame(self.books_container, fg_color="transparent")
        header.pack(fill="x", pady=10)
        
        ctk.CTkLabel(header, text="Book Management", font=ctk.CTkFont(size=18, weight="bold")).pack(side="left")
        ctk.CTkButton(header, text="+ Add Book", command=self.show_add_book_view, width=100).pack(side="right")
        
        # List
        self.books_scroll = ctk.CTkScrollableFrame(self.books_container)
        self.books_scroll.pack(fill="both", expand=True)
        
        self.refresh_book_list()

    def show_add_book_view(self):
        # Clear container
        for widget in self.books_container.winfo_children():
            widget.destroy()

        # Header with Back Button
        header = ctk.CTkFrame(self.books_container, fg_color="transparent")
        header.pack(fill="x", pady=10)
        
        ctk.CTkButton(header, text="← Back", command=self.show_book_list_view, width=80, fg_color="gray").pack(side="left", padx=(0, 10))
        ctk.CTkLabel(header, text="Add New Book", font=ctk.CTkFont(size=18, weight="bold")).pack(side="left")

        # Form
        form_frame = ctk.CTkScrollableFrame(self.books_container)
        form_frame.pack(fill="both", expand=True, padx=20)

        self.book_cover_path = ""
        self.book_file_path = ""

        ctk.CTkLabel(form_frame, text="Title").pack(pady=5)
        self.title_entry = ctk.CTkEntry(form_frame, width=400)
        self.title_entry.pack(pady=5)

        ctk.CTkLabel(form_frame, text="Author").pack(pady=5)
        self.author_entry = ctk.CTkEntry(form_frame, width=400)
        self.author_entry.pack(pady=5)

        ctk.CTkLabel(form_frame, text="Category").pack(pady=5)
        self.category_entry = ctk.CTkComboBox(form_frame, values=BOOK_CATEGORIES, width=400)
        self.category_entry.pack(pady=5)

        ctk.CTkLabel(form_frame, text="Narrator (Optional)").pack(pady=5)
        self.narrator_entry = ctk.CTkEntry(form_frame, width=400)
        self.narrator_entry.pack(pady=5)

        ctk.CTkLabel(form_frame, text="Duration (e.g. 1h 30m) (Optional)").pack(pady=5)
        self.duration_entry = ctk.CTkEntry(form_frame, width=400)
        self.duration_entry.pack(pady=5)

        ctk.CTkLabel(form_frame, text="Price ($)").pack(pady=5)
        self.price_entry = ctk.CTkEntry(form_frame, width=400)
        self.price_entry.pack(pady=5)
        
        ctk.CTkLabel(form_frame, text="Description").pack(pady=5)
        self.desc_entry = ctk.CTkTextbox(form_frame, width=400, height=100)
        self.desc_entry.pack(pady=5)

        # File Selection
        file_frame = ctk.CTkFrame(form_frame, fg_color="transparent")
        file_frame.pack(pady=20)

        ctk.CTkButton(file_frame, text="Select Cover Image", command=self.select_cover).grid(row=0, column=0, padx=10)
        self.cover_label = ctk.CTkLabel(file_frame, text="No file selected")
        self.cover_label.grid(row=0, column=1, padx=10)

        ctk.CTkButton(file_frame, text="Select Book File", command=self.select_file).grid(row=1, column=0, padx=10, pady=10)
        self.file_label = ctk.CTkLabel(file_frame, text="No file selected")
        self.file_label.grid(row=1, column=1, padx=10, pady=10)

        ctk.CTkButton(form_frame, text="Save Book", command=self.save_book, fg_color="green", width=200, height=40).pack(pady=20)

    # --- USER VIEWS ---

    def show_user_list_view(self):
        # Clear container
        for widget in self.users_container.winfo_children():
            widget.destroy()

        # Header
        header = ctk.CTkFrame(self.users_container, fg_color="transparent")
        header.pack(fill="x", pady=10)
        
        ctk.CTkLabel(header, text="User Management", font=ctk.CTkFont(size=18, weight="bold")).pack(side="left")
        ctk.CTkButton(header, text="+ Add User", command=self.show_add_user_view, width=100).pack(side="right")
        
        # List
        self.users_scroll = ctk.CTkScrollableFrame(self.users_container)
        self.users_scroll.pack(fill="both", expand=True)
        
        self.refresh_user_list()

    def show_add_user_view(self):
        # Clear container
        for widget in self.users_container.winfo_children():
            widget.destroy()

        # Header with Back Button
        header = ctk.CTkFrame(self.users_container, fg_color="transparent")
        header.pack(fill="x", pady=10)
        
        ctk.CTkButton(header, text="← Back", command=self.show_user_list_view, width=80, fg_color="gray").pack(side="left", padx=(0, 10))
        ctk.CTkLabel(header, text="Add New User", font=ctk.CTkFont(size=18, weight="bold")).pack(side="left")

        # Form
        form_frame = ctk.CTkFrame(self.users_container)
        form_frame.pack(fill="both", expand=True, padx=20, pady=20)

        ctk.CTkLabel(form_frame, text="Username").pack(pady=5)
        self.username_entry = ctk.CTkEntry(form_frame, width=300)
        self.username_entry.pack(pady=5)

        ctk.CTkLabel(form_frame, text="Email").pack(pady=5)
        self.email_entry = ctk.CTkEntry(form_frame, width=300)
        self.email_entry.pack(pady=5)

        ctk.CTkLabel(form_frame, text="Password").pack(pady=5)
        self.password_entry = ctk.CTkEntry(form_frame, width=300, show="*")
        self.password_entry.pack(pady=5)

        self.is_admin_var = ctk.BooleanVar()
        self.admin_check = ctk.CTkCheckBox(form_frame, text="Is Admin", variable=self.is_admin_var)
        self.admin_check.pack(pady=10)

        ctk.CTkButton(form_frame, text="Save User", command=self.save_user, fg_color="green", width=200).pack(pady=20)

    # --- LOGIC ---

    def refresh_book_list(self):
        for widget in self.books_scroll.winfo_children():
            widget.destroy()

        try:
            books = utils.get_all_books()
            for book in books:
                row = ctk.CTkFrame(self.books_scroll)
                row.pack(fill="x", pady=5, padx=5)
                
                ctk.CTkLabel(row, text=book['title'], font=ctk.CTkFont(weight="bold"), width=200, anchor="w").pack(side="left", padx=10)
                ctk.CTkLabel(row, text=book['author'], width=150, anchor="w").pack(side="left", padx=10)
                ctk.CTkLabel(row, text=f"${book['price']}", width=80).pack(side="left", padx=10)
                
                ctk.CTkButton(row, text="Delete", fg_color="red", width=60, command=lambda b=book: self.delete_book(b['id'])).pack(side="right", padx=10)
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load books: {e}")

    def refresh_user_list(self):
        for widget in self.users_scroll.winfo_children():
            widget.destroy()

        try:
            users = utils.get_all_users()
            for user in users:
                row = ctk.CTkFrame(self.users_scroll)
                row.pack(fill="x", pady=5, padx=5)
                
                ctk.CTkLabel(row, text=user.get('displayName', 'N/A'), font=ctk.CTkFont(weight="bold"), width=150, anchor="w").pack(side="left", padx=10)
                ctk.CTkLabel(row, text=user.get('email', 'N/A'), width=200, anchor="w").pack(side="left", padx=10)
                role = "Admin" if user.get('isAdmin', False) else "User"
                ctk.CTkLabel(row, text=role, width=80).pack(side="left", padx=10)
                
                ctk.CTkButton(row, text="Delete", fg_color="red", width=60, command=lambda u=user: self.delete_user(u['id'])).pack(side="right", padx=10)
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load users: {e}")

    def select_cover(self):
        filename = filedialog.askopenfilename(filetypes=[("Image Files", "*.jpg;*.png;*.jpeg")])
        if filename:
            self.book_cover_path = filename
            self.cover_label.configure(text=os.path.basename(filename))

    def select_file(self):
        filename = filedialog.askopenfilename(filetypes=[("Book Files", "*.pdf;*.epub;*.mp3")])
        if filename:
            self.book_file_path = filename
            self.file_label.configure(text=os.path.basename(filename))

    def save_book(self):
        if not self.book_cover_path or not self.book_file_path:
            messagebox.showerror("Error", "Please select both cover and book file.")
            return

        try:
            utils.add_book(
                self.title_entry.get(),
                self.author_entry.get(),
                self.category_entry.get(),
                self.price_entry.get(),
                self.book_cover_path,
                self.book_file_path,
                self.desc_entry.get("1.0", "end-1c"),
                self.narrator_entry.get(),
                self.duration_entry.get()
            )
            messagebox.showinfo("Success", "Book added successfully!")
            self.show_book_list_view()
        except Exception as e:
            messagebox.showerror("Error", str(e))

    def save_user(self):
        try:
            utils.add_user(
                self.username_entry.get(),
                self.email_entry.get(),
                self.password_entry.get(),
                self.is_admin_var.get()
            )
            messagebox.showinfo("Success", "User added successfully!")
            self.show_user_list_view()
        except Exception as e:
            messagebox.showerror("Error", str(e))

    def delete_book(self, book_id):
        if messagebox.askyesno("Confirm", "Are you sure you want to delete this book?"):
            utils.delete_book(book_id)
            self.refresh_book_list()

    def delete_user(self, user_id):
        if messagebox.askyesno("Confirm", "Are you sure you want to delete this user?"):
            utils.delete_user(user_id)
            self.refresh_user_list()

if __name__ == "__main__":
    app = App()
    app.mainloop()
