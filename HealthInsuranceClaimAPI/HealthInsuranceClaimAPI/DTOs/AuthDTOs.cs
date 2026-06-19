using System.ComponentModel.DataAnnotations;
using HealthInsuranceClaimAPI.Models;
using HealthInsuranceClaimAPI.Enums;

namespace HealthInsuranceClaimAPI.DTOs
{
    public class LoginDto
    {
        [Required]
        [EmailAddress]
        [StringLength(100, ErrorMessage = "Email cannot exceed 100 characters")]
        public string Email { get; set; } = string.Empty;
        
        [Required]
        [MinLength(1, ErrorMessage = "Password is required")]
        public string Password { get; set; } = string.Empty;
    }

    public class RegisterCustomerDto
    {
        [Required]
        [EmailAddress]
        [StringLength(100, ErrorMessage = "Email cannot exceed 100 characters")]
        public string Email { get; set; } = string.Empty;
        
        [Required]
        [MinLength(8, ErrorMessage = "Password must be at least 8 characters")]
        [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$", ErrorMessage = "Password must contain at least 8 characters, 1 uppercase, 1 lowercase, 1 number and 1 special character")]
        public string Password { get; set; } = string.Empty;
        
        [Required]
        [StringLength(50, MinimumLength = 2, ErrorMessage = "First name must be between 2 and 50 characters")]
        [RegularExpression(@"^[A-Za-z\s]+$", ErrorMessage = "First name can only contain letters and spaces")]
        public string FirstName { get; set; } = string.Empty;
        
        [Required]
        [StringLength(50, MinimumLength = 2, ErrorMessage = "Last name must be between 2 and 50 characters")]
        [RegularExpression(@"^[A-Za-z\s]+$", ErrorMessage = "Last name can only contain letters and spaces")]
        public string LastName { get; set; } = string.Empty;
        
        [Required]
        [CustomValidation(typeof(RegisterCustomerDto), nameof(ValidateAge))]
        public DateTime DateOfBirth { get; set; }
        
        public static ValidationResult? ValidateAge(DateTime dateOfBirth, ValidationContext context)
        {
            Console.WriteLine($"Backend validation: Validating DOB: {dateOfBirth}");
            var age = DateTime.Today.Year - dateOfBirth.Year;
            if (dateOfBirth.Date > DateTime.Today.AddYears(-age)) age--;
            
            Console.WriteLine($"Backend validation: Calculated age: {age}");
            if (age < 18)
            {
                Console.WriteLine("Backend validation: Age < 18, returning error");
                return new ValidationResult("Minimum age required is 18");
            }
            
            Console.WriteLine("Backend validation: Age validation passed");
            return ValidationResult.Success;
        }
        
        [Required]
        [RegularExpression(@"^\d{10}$", ErrorMessage = "Please enter a valid 10-digit phone number")]
        public string Phone { get; set; } = string.Empty;
        
        [Required]
        [StringLength(200, MinimumLength = 10, ErrorMessage = "Address must be between 10 and 200 characters")]
        public string Address { get; set; } = string.Empty;
    }

    public class RegisterHospitalDto
    {
        [Required]
        [EmailAddress]
        [StringLength(100, ErrorMessage = "Email cannot exceed 100 characters")]
        public string Email { get; set; } = string.Empty;
        
        [Required]
        [MinLength(8, ErrorMessage = "Password must be at least 8 characters")]
        [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$", ErrorMessage = "Password must contain at least 8 characters, 1 uppercase, 1 lowercase, 1 number and 1 special character")]
        public string Password { get; set; } = string.Empty;
        
        [Required]
        [StringLength(50, MinimumLength = 2, ErrorMessage = "First name must be between 2 and 50 characters")]
        [RegularExpression(@"^[A-Za-z\s]+$", ErrorMessage = "First name can only contain letters and spaces")]
        public string FirstName { get; set; } = string.Empty;
        
        [Required]
        [StringLength(50, MinimumLength = 2, ErrorMessage = "Last name must be between 2 and 50 characters")]
        [RegularExpression(@"^[A-Za-z\s]+$", ErrorMessage = "Last name can only contain letters and spaces")]
        public string LastName { get; set; } = string.Empty;
        

        [Required]
        [RegularExpression(@"^[A-Z0-9]{6,20}$", ErrorMessage = "License number must be 6-20 alphanumeric characters")]
        public string LicenseNumber { get; set; } = string.Empty;
        
        [Required]
        [StringLength(200, MinimumLength = 10, ErrorMessage = "Address must be between 10 and 200 characters")]
        public string Address { get; set; } = string.Empty;
        
        [Required]
        [RegularExpression(@"^\d{10}$", ErrorMessage = "Please enter a valid 10-digit phone number")]
        public string Phone { get; set; } = string.Empty;
    }

    public class AuthResponseDto
    {
        public bool Success { get; set; } = true;
        public string Message { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public UserRole Role { get; set; }
        public string Email { get; set; } = string.Empty;
        public int UserId { get; set; }
    }

    public class ClaimOfficerResponseDto
    {
        public int UserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public UserRole Role { get; set; }
        public string Token { get; set; } = string.Empty;
    }

    public class AddClaimOfficerDto
    {
        [Required]
        [EmailAddress]
        [StringLength(100)]
        public string Email { get; set; } = string.Empty;
        
        [Required]
        [MinLength(8, ErrorMessage = "Password must be at least 8 characters")]
        public string Password { get; set; } = string.Empty;
        
        [Required]
        [StringLength(50)]
        public string FirstName { get; set; } = string.Empty;
        
        [Required]
        [StringLength(50)]
        public string LastName { get; set; } = string.Empty;
    }
}