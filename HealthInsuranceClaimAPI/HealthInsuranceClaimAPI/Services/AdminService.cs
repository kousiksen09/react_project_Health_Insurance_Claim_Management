using HealthInsuranceClaimAPI.DTOs;
using HealthInsuranceClaimAPI.Interfaces.IRepository;
using HealthInsuranceClaimAPI.Interfaces.IService;
using HealthInsuranceClaimAPI.Models;
using HealthInsuranceClaimAPI.Enums;
using System.Security.Cryptography;
using System.Text;

namespace HealthInsuranceClaimAPI.Services
{
    public class AdminService : IAdminService
    {
        private readonly IUserRepository _userRepository;
        private readonly ICustomerRepository _customerRepository;
        private readonly IHospitalRepository _hospitalRepository;
        private readonly IClaimOfficerRepository _claimOfficerRepository;
        private readonly IClaimRepository _claimRepository;
        private readonly IPolicyRepository _policyRepository;
        private readonly ICustomerPolicyRepository _customerPolicyRepository;
        private readonly INotificationService _notificationService;
        private readonly IFileService _fileService;

        public AdminService(
            IUserRepository userRepository,
            ICustomerRepository customerRepository,
            IHospitalRepository hospitalRepository,
            IClaimOfficerRepository claimOfficerRepository,
            IClaimRepository claimRepository,
            IPolicyRepository policyRepository,
            ICustomerPolicyRepository customerPolicyRepository,
            INotificationService notificationService,
            IFileService fileService)
        {
            _userRepository = userRepository;
            _customerRepository = customerRepository;
            _hospitalRepository = hospitalRepository;
            _claimOfficerRepository = claimOfficerRepository;
            _claimRepository = claimRepository;
            _policyRepository = policyRepository;
            _customerPolicyRepository = customerPolicyRepository;
            _notificationService = notificationService;
            _fileService = fileService;
        }

        public async Task<object> GetDashboardAsync()
        {
            var users = await _userRepository.GetAllAsync();
            var customers = await _customerRepository.GetAllAsync();
            var hospitals = await _hospitalRepository.GetAllAsync();
            var claimOfficers = await _claimOfficerRepository.GetAllAsync();
            var policies = await _policyRepository.GetAllAsync();
            var claims = await _claimRepository.GetAllAsync();
            
            return new
            {
                TotalUsers = users.Count(),
                TotalCustomers = customers.Count(),
                TotalHospitals = hospitals.Count(),
                TotalClaimOfficers = claimOfficers.Count(),
                TotalPolicies = policies.Count(),
                TotalClaims = claims.Count(),
                PendingClaims = await _claimRepository.GetCountByStatusAsync(ClaimStatus.Submitted),
                ApprovedClaims = await _claimRepository.GetCountByStatusAsync(ClaimStatus.Approved),
                RejectedClaims = await _claimRepository.GetCountByStatusAsync(ClaimStatus.Rejected)
            };
        }

        public async Task<IEnumerable<object>> GetAllUsersAsync()
        {
            var users = await _userRepository.GetAllAsync();
            var result = new List<object>();
            
            foreach (var user in users)
            {
                Console.WriteLine($"User {user.Id}: FirstName='{user.FirstName}', LastName='{user.LastName}'");
                
                string firstName = user.FirstName ?? "N/A";
                string lastName = user.LastName ?? "N/A";
                string name = "N/A";
                
                if (!string.IsNullOrEmpty(user.FirstName) && !string.IsNullOrEmpty(user.LastName))
                {
                    firstName = user.FirstName;
                    lastName = user.LastName;
                    name = $"{user.FirstName} {user.LastName}";
                    Console.WriteLine($"Using User fields: {name}");
                }
                else
                {
                   
                    switch (user.Role)
                    {
                        case UserRole.Customer:
                            var customer = await _customerRepository.GetByUserIdAsync(user.Id);
                            if (customer != null)
                            {
                                firstName = customer.FirstName;
                                lastName = customer.LastName;
                                name = $"{customer.FirstName} {customer.LastName}";
                            }
                            break;
                        case UserRole.Hospital:
                            var hospital = await _hospitalRepository.GetByUserIdAsync(user.Id);
                            if (hospital != null)
                            {
                                name = hospital.Name;
                                firstName = hospital.Name;
                                lastName = "";
                            }
                            break;
                        case UserRole.ClaimOfficer:
                            var officer = await _claimOfficerRepository.GetByUserIdAsync(user.Id);
                            if (officer != null)
                            {
                                firstName = officer.FirstName;
                                lastName = officer.LastName;
                                name = $"{officer.FirstName} {officer.LastName}";
                            }
                            break;
                    }
                }
                
                result.Add(new
                {
                    user.Id,
                    user.Email,
                    user.Role,
                    user.IsActive,
                    user.CreatedAt,
                    FirstName = firstName,
                    LastName = lastName,
                    Name = name
                });
            }
            
            return result;
        }

        public async Task<IEnumerable<object>> GetAllCustomersAsync()
        {
            var customers = await _customerRepository.GetAllWithUserAsync();
            return customers.Select(c => new
            {
                c.Id,
                Name = $"{c.FirstName} {c.LastName}",
                Email = c.User?.Email ?? "N/A",
                PhoneNumber = c.Phone,
                Address = c.Address,
                IsActive = c.User?.IsActive ?? false,
                CreatedAt = c.User?.CreatedAt ?? DateTime.MinValue,
                UserId = c.User?.Id ?? 0
            });
        }

        public async Task<string> ToggleCustomerStatusAsync(int userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                throw new ArgumentException("Customer not found");

            user.IsActive = !user.IsActive;
            await _userRepository.UpdateAsync(user);

            return $"Customer status updated to {(user.IsActive ? "Active" : "Inactive")}";
        }

        public async Task<IEnumerable<object>> GetAllHospitalsAsync()
        {
            var hospitals = await _hospitalRepository.GetAllWithUserAsync();
            return hospitals.Select(h => new
            {
                h.Id,
                h.Name,
                h.LicenseNumber,
                h.Address,
                h.ContactNumber,
                Email = h.User.Email,
                IsActive = h.User.IsActive,
                CreatedAt = h.User.CreatedAt,
                UserId = h.User.Id
            });
        }

        public async Task<string> ToggleUserStatusAsync(int id)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null)
                throw new ArgumentException("User not found");

            user.IsActive = !user.IsActive;
            await _userRepository.UpdateAsync(user);

            return $"User status updated to {(user.IsActive ? "Active" : "Inactive")}";
        }

        public async Task<string> DeleteUserAsync(int id)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null)
                throw new ArgumentException("User not found");

            switch (user.Role)
            {
                case UserRole.Customer:
                    var customer = await _customerRepository.GetByUserIdAsync(id);
                    if (customer != null)
                        await _customerRepository.DeleteAsync(customer);
                    break;
                case UserRole.Hospital:
                    var hospital = await _hospitalRepository.GetByUserIdAsync(id);
                    if (hospital != null)
                        await _hospitalRepository.DeleteAsync(hospital);
                    break;
                case UserRole.ClaimOfficer:
                    var officer = await _claimOfficerRepository.GetByUserIdAsync(id);
                    if (officer != null)
                        await _claimOfficerRepository.DeleteAsync(officer);
                    break;
            }

            await _userRepository.DeleteAsync(user);
            return "User deleted successfully";
        }

        public async Task<IEnumerable<object>> GetPoliciesAsync()
        {
            var policies = await _policyRepository.GetAllPoliciesAsync();
            var result = new List<object>();
            
            foreach (var policy in policies)
            {
                var activeCustomersCount = await _customerPolicyRepository.GetActiveCountByPolicyIdAsync(policy.Id);
                result.Add(new
                {
                    policy.Id,
                    policy.Name,
                    policy.Description,
                    policy.Premium,
                    policy.CoverageAmount,
                    policy.DurationMonths,
                    policy.PolicyType,
                    policy.IsActive,
                    policy.CreatedAt,
                    ActiveCustomersCount = activeCustomersCount
                });
            }
            
            return result;
        }

        public async Task<Policy?> GetPolicyAsync(int id)
        {
            return await _policyRepository.GetByIdAsync(id);
        }

        public async Task<Policy> CreatePolicyAsync(Policy policy)
        {
            policy.PolicyNumber = $"POL{Random.Shared.Next(1000, 9999)}";
            await _policyRepository.CreateAsync(policy);
            return policy;
        }

        public async Task<string> UpdatePolicyAsync(int id, Policy policy)
        {
            var existingPolicy = await _policyRepository.GetByIdAsync(id);
            if (existingPolicy == null)
                throw new ArgumentException("Policy not found");

         
            var activeCustomersCount = await _customerPolicyRepository.GetActiveCountByPolicyIdAsync(id);
            if (activeCustomersCount > 0)
                throw new ArgumentException("Cannot update policy that has active customers");

            existingPolicy.Name = policy.Name;
            existingPolicy.Description = policy.Description;
            existingPolicy.Premium = policy.Premium;
            existingPolicy.CoverageAmount = policy.CoverageAmount;
            existingPolicy.DurationMonths = policy.DurationMonths;
            existingPolicy.PolicyType = policy.PolicyType;
            existingPolicy.IsActive = policy.IsActive;

            await _policyRepository.UpdateAsync(existingPolicy);
            return "Policy updated successfully";
        }

        public async Task<string> DeletePolicyAsync(int id)
        {
            var policy = await _policyRepository.GetByIdAsync(id);
            if (policy == null)
                throw new ArgumentException("Policy not found");

            var activeCustomersCount = await _customerPolicyRepository.GetActiveCountByPolicyIdAsync(id);
            if (activeCustomersCount > 0)
                throw new ArgumentException("Cannot delete policy with active customers");

            await _policyRepository.DeleteAsync(policy);
            return "Policy deleted successfully";
        }



        public async Task<string> ArchivePolicyAsync(int id)
        {
            var policy = await _policyRepository.GetByIdAsync(id);
            if (policy == null)
                throw new ArgumentException("Policy not found");

            var activeCustomersCount = await _customerPolicyRepository.GetActiveCountByPolicyIdAsync(policy.Id);
            if (activeCustomersCount > 0)
                throw new ArgumentException("Cannot archive policy with active customers");

            policy.IsActive = false;
            await _policyRepository.UpdateAsync(policy);
            return "Policy archived successfully";
        }

        public async Task<string> TogglePolicyStatusAsync(int id)
        {
            var policy = await _policyRepository.GetByIdAsync(id);
            if (policy == null)
                throw new ArgumentException("Policy not found");

            policy.IsActive = !policy.IsActive;
            await _policyRepository.UpdateAsync(policy);

            return $"Policy status updated to {(policy.IsActive ? "Active" : "Inactive")}";
        }

        public async Task<ClaimOfficerResponseDto> AddClaimOfficerAsync(AddClaimOfficerDto addDto)
        {
            if (await _userRepository.EmailExistsAsync(addDto.Email))
                throw new ArgumentException("Email already exists");

            var user = new User
            {
                Email = addDto.Email,
                PasswordHash = ComputeSha256Hash(addDto.Password),
                Role = UserRole.ClaimOfficer,
                FirstName = addDto.FirstName,
                LastName = addDto.LastName
            };

            await _userRepository.CreateAsync(user);
            
            var claimOfficer = new ClaimOfficer
            {
                UserId = user.Id,
                FirstName = addDto.FirstName,
                LastName = addDto.LastName
            };

            await _claimOfficerRepository.CreateAsync(claimOfficer);

            return new ClaimOfficerResponseDto
            {
                UserId = user.Id,
                Email = user.Email,
                Role = user.Role,
                Token = string.Empty 
            };
        }

        public async Task<IEnumerable<object>> GetClaimOfficersAsync()
        {
            return await _claimOfficerRepository.GetAllWithUserAsync();
        }



        public async Task<string> ToggleClaimOfficerStatusAsync(int id)
        {
            var claimOfficer = await _claimOfficerRepository.GetByIdWithUserAsync(id);

            if (claimOfficer == null)
                throw new ArgumentException("Claim officer not found");

            claimOfficer.User.IsActive = !claimOfficer.User.IsActive;
            await _userRepository.UpdateAsync(claimOfficer.User);

            return $"Claim officer status updated to {(claimOfficer.User.IsActive ? "Active" : "Inactive")}";
        }

        public async Task<string> DeleteClaimOfficerAsync(int id)
        {
            var claimOfficer = await _claimOfficerRepository.GetByIdWithUserAsync(id);
            if (claimOfficer == null)
                throw new ArgumentException("Claim officer not found");

            await _claimOfficerRepository.DeleteAsync(claimOfficer);
            await _userRepository.DeleteAsync(claimOfficer.User);

            return "Claim officer deleted successfully";
        }





        public async Task<IEnumerable<ClaimDto>> GetAllClaimsAsync()
        {
            return await _claimRepository.GetAllClaimsAsync();
        }

        public async Task<string> AssignClaimOfficerAsync(int claimId, int officerId)
        {
            var claim = await _claimRepository.GetByIdWithIncludesAsync(claimId);
            if (claim == null)
                throw new ArgumentException("Claim not found");

            var officer = await _claimOfficerRepository.GetByIdWithUserAsync(officerId);
            if (officer == null)
                throw new ArgumentException("Claim officer not found");

            claim.ClaimOfficerId = officerId;
            await _claimRepository.UpdateAsync(claim);

          
            await _notificationService.CreateNotificationWithEmailAsync(
                officer.UserId,
                "Claim Assigned",
                $"Claim {claim.ClaimNumber} has been assigned to you for review - Amount: ₹{claim.ClaimAmount}",
                NotificationType.ClaimStatusUpdate
            );

            await _notificationService.CreateNotificationWithEmailAsync(
                claim.CustomerPolicy.Customer.UserId,
                "Claim Under Review",
                $"Your claim {claim.ClaimNumber} has been assigned to a claim officer for review",
                NotificationType.ClaimStatusUpdate
            );

            await _notificationService.CreateNotificationWithEmailAsync(
                claim.Hospital.UserId,
                "Claim Under Review",
                $"Claim {claim.ClaimNumber} has been assigned to a claim officer for review",
                NotificationType.ClaimStatusUpdate
            );

            return $"Claim {claim.ClaimNumber} assigned to {officer.FirstName} {officer.LastName}";
        }

        private static string ComputeSha256Hash(string rawData)
        {
            using (SHA256 sha256Hash = SHA256.Create())
            {
                byte[] bytes = sha256Hash.ComputeHash(Encoding.UTF8.GetBytes(rawData));
                return Convert.ToHexString(bytes).ToLower();
            }
        }

        public async Task<ProfileResponseDto> GetProfileAsync(int userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                throw new ArgumentException("User not found");

            return new ProfileResponseDto
            {
                Id = user.Id,
                Email = user.Email,
                Role = (int)user.Role,
                FirstName = user.FirstName,
                LastName = user.LastName,
                ProfileImageUrl = user.ProfileImageUrl,
                IsActive = user.IsActive
            };
        }

        public async Task<string> UpdateProfileAsync(int userId, UpdateAdminProfileDto updateDto)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                throw new ArgumentException("User not found");

            user.FirstName = updateDto.FirstName;
            user.LastName = updateDto.LastName;

            if (updateDto.ProfileImage != null)
            {
                var imageUrl = await _fileService.SaveProfileImageAsync(updateDto.ProfileImage, userId);
                user.ProfileImageUrl = imageUrl;
            }

            await _userRepository.UpdateAsync(user);
            return "Profile updated successfully";
        }
    }
}