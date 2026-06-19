using HealthInsuranceClaimAPI.DTOs;
using HealthInsuranceClaimAPI.Interfaces.IRepository;
using HealthInsuranceClaimAPI.Interfaces.IService;
using HealthInsuranceClaimAPI.Models;
using HealthInsuranceClaimAPI.Enums;
using System.Security.Cryptography;
using System.Text;

namespace HealthInsuranceClaimAPI.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly ICustomerRepository _customerRepository;
        private readonly IHospitalRepository _hospitalRepository;
        private readonly IClaimOfficerRepository _claimOfficerRepository;
        private readonly IJwtService _jwtService;
        private readonly IFileService _fileService;

        public AuthService(
            IUserRepository userRepository,
            ICustomerRepository customerRepository,
            IHospitalRepository hospitalRepository,
            IClaimOfficerRepository claimOfficerRepository,
            IJwtService jwtService,
            IFileService fileService)
        {
            _userRepository = userRepository;
            _customerRepository = customerRepository;
            _hospitalRepository = hospitalRepository;
            _claimOfficerRepository = claimOfficerRepository;
            _jwtService = jwtService;
            _fileService = fileService;
        }

        public async Task<AuthResponseDto> LoginAsync(LoginDto loginDto)
        {
            var user = await _userRepository.GetByEmailAsync(loginDto.Email);
            
            if (user == null)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Invalid email or password"
                };
            }
            
            var hashedPassword = ComputeSha256Hash(loginDto.Password);
            if (user.PasswordHash != hashedPassword)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Invalid email or password"
                };
            }

            if (!user.IsActive)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Account is inactive"
                };
            }

            var token = _jwtService.GenerateToken(user);

            return new AuthResponseDto
            {
                Success = true,
                Token = token,
                Role = user.Role,
                Email = user.Email,
                UserId = user.Id
            };
        }

        public async Task<AuthResponseDto> RegisterCustomerAsync(RegisterCustomerDto registerDto)
        {
            if (await _userRepository.EmailExistsAsync(registerDto.Email))
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Email already exists"
                };
            }

            var user = new User
            {
                Email = registerDto.Email,
                PasswordHash = ComputeSha256Hash(registerDto.Password),
                Role = UserRole.Customer,
                FirstName = registerDto.FirstName,
                LastName = registerDto.LastName,
                IsActive = true
            };

            await _userRepository.CreateAsync(user);

            var customerNumber = $"CUS{DateTime.Now:yyyyMMdd}{Random.Shared.Next(100, 999)}";
            
            var customer = new Customer
            {
                CustomerNumber = customerNumber,
                UserId = user.Id,
                FirstName = registerDto.FirstName,
                LastName = registerDto.LastName,
                DateOfBirth = registerDto.DateOfBirth,
                Phone = registerDto.Phone,
                Address = registerDto.Address
            };

            await _customerRepository.CreateAsync(customer);

            return new AuthResponseDto
            {
                Success = true,
                Token = string.Empty,
                Role = user.Role,
                Email = user.Email,
                UserId = user.Id
            };
        }

        public async Task<AuthResponseDto> RegisterHospitalAsync(RegisterHospitalDto registerDto)
        {
            if (await _userRepository.EmailExistsAsync(registerDto.Email))
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Email already exists"
                };
            }

            if (await _hospitalRepository.LicenseExistsAsync(registerDto.LicenseNumber))
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "License number already exists"
                };
            }

            var user = new User
            {
                Email = registerDto.Email,
                PasswordHash = ComputeSha256Hash(registerDto.Password),
                Role = UserRole.Hospital,
                FirstName = registerDto.FirstName,
                LastName = registerDto.LastName,
                IsActive = true
            };

            await _userRepository.CreateAsync(user);

            var hospital = new Hospital
            {
                UserId = user.Id,
                FirstName = registerDto.FirstName,
                LastName = registerDto.LastName,
                Name = $"{registerDto.FirstName} {registerDto.LastName}",
                LicenseNumber = registerDto.LicenseNumber,
                Address = registerDto.Address,
                ContactNumber = registerDto.Phone
            };

            await _hospitalRepository.CreateAsync(hospital);

            return new AuthResponseDto
            {
                Success = true,
                Token = string.Empty,
                Role = user.Role,
                Email = user.Email,
                UserId = user.Id
            };
        }

        public async Task<ProfileResponseDto> GetProfileAsync(int userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                throw new ArgumentException("User not found");

            var profile = new ProfileResponseDto
            {
                Id = user.Id,
                Email = user.Email,
                Role = (int)user.Role,
                IsActive = user.IsActive,
                ProfileImageUrl = user.ProfileImageUrl
            };

            switch (user.Role)
            {
                case UserRole.Customer:
                    var customer = await _customerRepository.GetByUserIdAsync(userId);
                    if (customer != null)
                    {
                        profile.FirstName = customer.FirstName;
                        profile.LastName = customer.LastName;
                        profile.Customer = new CustomerProfileDto
                        {
                            CustomerNumber = customer.CustomerNumber,
                            DateOfBirth = customer.DateOfBirth,
                            Phone = customer.Phone,
                            Address = customer.Address
                        };
                    }
                    break;
                    
                case UserRole.Hospital:
                    var hospital = await _hospitalRepository.GetByUserIdAsync(userId);
                    if (hospital != null)
                    {
                        // Use hospital firstName/lastName if available, otherwise fallback to hospital name parts
                        profile.FirstName = hospital.FirstName ?? "Hospital";
                        profile.LastName = hospital.LastName ?? "User";
                        profile.Hospital = new HospitalProfileDto
                        {
                            Name = hospital.Name,
                            LicenseNumber = hospital.LicenseNumber,
                            Address = hospital.Address,
                            ContactNumber = hospital.ContactNumber
                        };
                    }
                    break;
                    
                case UserRole.ClaimOfficer:
                    var claimOfficer = await _claimOfficerRepository.GetByUserIdAsync(userId);
                    if (claimOfficer != null)
                    {
                        profile.FirstName = claimOfficer.FirstName;
                        profile.LastName = claimOfficer.LastName;
                    }
                    break;
                    
                case UserRole.Admin:
                    // For Admin, use the User model's FirstName and LastName fields
                    profile.FirstName = user.FirstName;
                    profile.LastName = user.LastName;
                    break;
            }

            return profile;
        }

        public async Task<string> UpdateCustomerProfileAsync(int userId, UpdateCustomerProfileDto updateDto)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null || user.Role != UserRole.Customer)
                throw new ArgumentException("Customer not found");

            if (updateDto.ProfileImage != null)
            {
                user.ProfileImageUrl = await _fileService.SaveProfileImageAsync(updateDto.ProfileImage, userId);
            }
            
            await _userRepository.UpdateAsync(user);

            var customer = await _customerRepository.GetByUserIdAsync(userId);
            if (customer != null)
            {
                customer.FirstName = updateDto.FirstName;
                customer.LastName = updateDto.LastName;
                customer.Phone = updateDto.Phone;
                customer.Address = updateDto.Address;
                customer.DateOfBirth = updateDto.DateOfBirth;
                await _customerRepository.UpdateAsync(customer);
            }

            return "Profile updated successfully";
        }

        public async Task<string> UpdateHospitalProfileAsync(int userId, UpdateHospitalProfileDto updateDto)
        {
            Console.WriteLine($"UpdateHospitalProfileAsync: userId={userId}");
            Console.WriteLine($"ProfileImage received: {updateDto.ProfileImage != null}");
            
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null || user.Role != UserRole.Hospital)
                throw new ArgumentException("Hospital not found");

            Console.WriteLine($"Current ProfileImageUrl: {user.ProfileImageUrl}");

            if (updateDto.ProfileImage != null)
            {
                Console.WriteLine($"Processing profile image: {updateDto.ProfileImage.FileName}");
                user.ProfileImageUrl = await _fileService.SaveProfileImageAsync(updateDto.ProfileImage, userId);
                Console.WriteLine($"New ProfileImageUrl: {user.ProfileImageUrl}");
            }
            
            await _userRepository.UpdateAsync(user);
            Console.WriteLine("Hospital user updated in database");

            var hospital = await _hospitalRepository.GetByUserIdAsync(userId);
            if (hospital != null)
            {
                hospital.FirstName = updateDto.FirstName;
                hospital.LastName = updateDto.LastName;
                hospital.Name = updateDto.Name;
                hospital.Address = updateDto.Address;
                hospital.ContactNumber = updateDto.ContactNumber;
                await _hospitalRepository.UpdateAsync(hospital);
            }

            return "Profile updated successfully";
        }

        public async Task<string> UpdateClaimOfficerProfileAsync(int userId, UpdateClaimOfficerProfileDto updateDto)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null || user.Role != UserRole.ClaimOfficer)
                throw new ArgumentException("Claim officer not found");

            if (updateDto.ProfileImage != null)
            {
                user.ProfileImageUrl = await _fileService.SaveProfileImageAsync(updateDto.ProfileImage, userId);
            }
            
            await _userRepository.UpdateAsync(user);

            var claimOfficer = await _claimOfficerRepository.GetByUserIdAsync(userId);
            if (claimOfficer != null)
            {
                claimOfficer.FirstName = updateDto.FirstName;
                claimOfficer.LastName = updateDto.LastName;
                await _claimOfficerRepository.UpdateAsync(claimOfficer);
            }

            return "Profile updated successfully";
        }

        public async Task<string> UpdateAdminProfileAsync(int userId, UpdateClaimOfficerProfileDto updateDto)
        {
            Console.WriteLine($"UpdateAdminProfileAsync: userId={userId}");
            Console.WriteLine($"ProfileImage received: {updateDto.ProfileImage != null}");
            
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null || user.Role != UserRole.Admin)
                throw new ArgumentException("Admin not found");

            Console.WriteLine($"Current ProfileImageUrl: {user.ProfileImageUrl}");
            
            user.FirstName = updateDto.FirstName;
            user.LastName = updateDto.LastName;
            
            if (updateDto.ProfileImage != null)
            {
                Console.WriteLine($"Processing profile image: {updateDto.ProfileImage.FileName}");
                user.ProfileImageUrl = await _fileService.SaveProfileImageAsync(updateDto.ProfileImage, userId);
                Console.WriteLine($"New ProfileImageUrl: {user.ProfileImageUrl}");
            }
            
            await _userRepository.UpdateAsync(user);
            Console.WriteLine("User updated in database");

            return "Profile updated successfully";
        }

        private static string ComputeSha256Hash(string rawData)
        {
            using (SHA256 sha256Hash = SHA256.Create())
            {
                byte[] bytes = sha256Hash.ComputeHash(Encoding.UTF8.GetBytes(rawData));
                return Convert.ToHexString(bytes).ToLower();
            }
        }
    }
}