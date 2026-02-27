from django.db import models
from django.contrib.auth.models import User # Lấy bảng User có sẵn của Django

PRIORITY_CHOICES = [
    ('low', 'Low'),
    ('medium', 'Medium'),
    ('high', 'High'),
]

SOURCE_CHOICES = [
    ('USER', 'User'),
    ('AI', 'AI'),
]

# CATEGORIES
class Category(models.Model):
    name = models.CharField(max_length=100)
    # user = null tức là category mặc định của hệ thống
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['name', 'user'],
                name='unique_category_per_user'
            ),
            models.UniqueConstraint(
                fields=['name'],
                condition=models.Q(user__isnull=True),
                name='unique_system_category'
            )
        ]

    def __str__(self):
        return f"{self.name} (System)" if not self.user else f"{self.name} ({self.user.username})"

# NOTES
class Note(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    
    title = models.CharField(max_length=255, blank=True)
    content = models.TextField(blank=True) # Để trống nếu là To-do list
    background_color = models.CharField(max_length=20, default='#FFFFFF')
    
    is_pinned = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False) # Soft delete (Thùng rác)
    
    reminder_at = models.DateTimeField(null=True, blank=True)

    # --- CÁC FIELD DÀNH CHO AI ---
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, null=True, blank=True)
    priority_source = models.CharField(max_length=10, choices=SOURCE_CHOICES, null=True, blank=True)
    
    due_date = models.DateTimeField(null=True, blank=True)
    due_date_source = models.CharField(max_length=10, choices=SOURCE_CHOICES, null=True, blank=True)
    
    is_task = models.BooleanField(null=True, blank=True)
    is_task_source = models.CharField(max_length=10, choices=SOURCE_CHOICES, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title if self.title else f"Note ID: {self.id}"

# CHECKLIST (CHO TODO LIST)
class ChecklistItem(models.Model):
    note = models.ForeignKey(Note, on_delete=models.CASCADE, related_name='checklists')
    content = models.CharField(max_length=255)
    is_checked = models.BooleanField(default=False)
    position = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['position'] # Tự động sắp xếp theo thứ tự kéo thả

# IMAGE
class NoteImage(models.Model):
    note = models.ForeignKey(Note, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='note_images/')
    ocr_text = models.TextField(blank=True, null=True, db_index=True) # db_index để search siêu tốc
    created_at = models.DateTimeField(auto_now_add=True)