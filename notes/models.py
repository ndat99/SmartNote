from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_delete
from django.dispatch import receiver

PRIORITY_CHOICES = [
    ('low', 'Low'),
    ('medium', 'Medium'),
    ('high', 'High'),
]

SOURCE_CHOICES = [
    ('USER', 'User'),
    ('AI', 'AI'),
]

NOTE_TYPE_CHOICES = [
    ('note', 'Note'),
    ('checklist', 'Checklist'),
]

# CATEGORIES
class Category(models.Model):
    name = models.CharField(max_length=100)
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

    note_type = models.CharField(max_length=20, choices=NOTE_TYPE_CHOICES, default='note')

    title = models.CharField(max_length=255, blank=True)
    content = models.TextField(blank=True)
    background_color = models.CharField(max_length=20, default='#FFFFFF')

    is_pinned = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    reminder_at = models.DateTimeField(null=True, blank=True)

    # AI fields
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, null=True, blank=True)
    priority_source = models.CharField(max_length=10, choices=SOURCE_CHOICES, null=True, blank=True)

    due_date = models.DateTimeField(null=True, blank=True)
    due_date_source = models.CharField(max_length=10, choices=SOURCE_CHOICES, null=True, blank=True)

    is_task = models.BooleanField(null=True, blank=True)
    is_task_source = models.CharField(max_length=10, choices=SOURCE_CHOICES, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            # Index chính cho trang home: lọc theo user + trạng thái + sắp xếp
            models.Index(
                fields=['user', 'is_deleted', 'is_archived', 'is_pinned', '-created_at'],
                name='note_home_list_idx',
            ),
            # Index cho trang trash
            models.Index(
                fields=['user', 'is_deleted', 'deleted_at'],
                name='note_trash_idx',
            ),
            # Index cho trang archive
            models.Index(
                fields=['user', 'is_archived', 'is_deleted', '-created_at'],
                name='note_archive_idx',
            ),
        ]

    def __str__(self):
        return self.title if self.title else f"Note ID: {self.id}"

    @property
    def checklist_stats(self):
        """Returns (checked, total) using prefetch cache — no extra query."""
        items = list(self.checklists.all())
        total = len(items)
        checked = sum(1 for i in items if i.is_checked)
        return checked, total


# CHECKLIST
class ChecklistItem(models.Model):
    note = models.ForeignKey(Note, on_delete=models.CASCADE, related_name='checklists')
    content = models.CharField(max_length=255)
    is_checked = models.BooleanField(default=False)
    position = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['position']


# IMAGE
class NoteImage(models.Model):
    note = models.ForeignKey(Note, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='note_images/')
    ocr_text = models.TextField(blank=True, null=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

@receiver(post_delete, sender=NoteImage)
def delete_note_image_file(sender, instance, **kwargs):
    """Automatically delete the physical file from storage when the NoteImage is deleted"""
    if instance.image:
        instance.image.delete(save=False)