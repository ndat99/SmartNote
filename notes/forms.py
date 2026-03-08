from allauth.account.forms import LoginForm, SignupForm

# 1. Form Đăng nhập
class CustomLoginForm(LoginForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Sửa Label và thêm Placeholder cho Tên đăng nhập
        self.fields['login'].label = "Tên đăng nhập hoặc Email"
        self.fields['login'].widget.attrs.update({'placeholder': 'Nhập tên đăng nhập hoặc email'})
        
        # Sửa Label và thêm Placeholder cho Mật khẩu
        self.fields['password'].label = "Mật khẩu"
        self.fields['password'].widget.attrs.update({'placeholder': 'Nhập mật khẩu của bạn'})
        
        # Nút Ghi nhớ tôi
        if 'remember' in self.fields:
            self.fields['remember'].label = "Ghi nhớ tôi"


# 2. Form Đăng ký
class CustomSignupForm(SignupForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        if 'username' in self.fields:
            self.fields['username'].label = "Tên đăng nhập"
            self.fields['username'].widget.attrs.update({'placeholder': 'Nhập tên đăng nhập'})
            
        if 'email' in self.fields:
            self.fields['email'].label = "Địa chỉ Email"
            self.fields['email'].widget.attrs.update({'placeholder': 'Nhập địa chỉ email'})
            
        self.fields['password1'].label = "Mật khẩu"
        self.fields['password1'].widget.attrs.update({'placeholder': 'Nhập mật khẩu'})
        
        self.fields['password2'].label = "Xác nhận mật khẩu"
        self.fields['password2'].widget.attrs.update({'placeholder': 'Nhập lại mật khẩu để xác nhận'})