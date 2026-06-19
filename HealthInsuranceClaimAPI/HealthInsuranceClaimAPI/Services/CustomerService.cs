using AutoMapper;
using HealthInsuranceClaimAPI.DTOs;
using HealthInsuranceClaimAPI.Enums;
using HealthInsuranceClaimAPI.Interfaces.IRepository;
using HealthInsuranceClaimAPI.Interfaces.IService;
using HealthInsuranceClaimAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace HealthInsuranceClaimAPI.Services
{
    public class CustomerService : ICustomerService
    {
        private readonly IPolicyRepository _policyRepository;
        private readonly ICustomerRepository _customerRepository;
        private readonly ICustomerPolicyRepository _customerPolicyRepository;
        private readonly IClaimRepository _claimRepository;
        private readonly IPaymentTransactionRepository _paymentRepository;
        private readonly INotificationService _notificationService;
        private readonly IMapper _mapper;
        private readonly IUserRepository _userRepository;
        private readonly IFileService _fileService;

        public CustomerService(
            IPolicyRepository policyRepository,
            ICustomerRepository customerRepository,
            ICustomerPolicyRepository customerPolicyRepository,
            IClaimRepository claimRepository,
            IPaymentTransactionRepository paymentRepository,
            INotificationService notificationService,
            IMapper mapper,
            IUserRepository userRepository,
            IFileService fileService)
        {
            _policyRepository = policyRepository;
            _customerRepository = customerRepository;
            _customerPolicyRepository = customerPolicyRepository;
            _claimRepository = claimRepository;
            _paymentRepository = paymentRepository;
            _notificationService = notificationService;
            _mapper = mapper;
            _userRepository = userRepository;
            _fileService = fileService;
        }

        public async Task<object> GetProfileAsync(int userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                throw new ArgumentException("User not found");

            var customer = await _customerRepository.GetByUserIdAsync(userId);
            if (customer == null)
                throw new ArgumentException("Customer not found");

            return new
            {
                id = user.Id,
                email = user.Email,
                role = (int)user.Role,
                firstName = user.FirstName ?? customer.FirstName,
                lastName = user.LastName ?? customer.LastName,
                profileImageUrl = user.ProfileImageUrl,
                isActive = user.IsActive,
                customer = new
                {
                    customerNumber = customer.CustomerNumber,
                    dateOfBirth = customer.DateOfBirth,
                    phone = customer.Phone,
                    address = customer.Address
                }
            };
        }

        public async Task<IEnumerable<PolicyDto>> GetAvailablePoliciesAsync(int userId)
        {
            var customer = await _customerRepository.GetByUserIdAsync(userId);
            if (customer == null)
                throw new ArgumentException("Customer not found");

            // Calculate customer age
            var today = DateTime.Today;
            var age = today.Year - customer.DateOfBirth.Year;
            if (customer.DateOfBirth.Date > today.AddYears(-age)) age--;

            var policies = await _policyRepository.GetActiveAsync();
            
            // Show all policies that customer is eligible for based on age
            var eligiblePolicies = policies.Where(policy => {
                var (minAge, maxAge) = GetAgeEligibility(policy.PolicyType);
                return age >= minAge && age <= maxAge;
            });
            
            return _mapper.Map<IEnumerable<PolicyDto>>(eligiblePolicies);
        }

        public async Task<PolicyDto> GetPolicyDetailsAsync(int policyId)
        {
            var policy = await _policyRepository.GetByIdAsync(policyId);
            if (policy == null || !policy.IsActive)
                throw new ArgumentException("Policy not found or inactive");
            return _mapper.Map<PolicyDto>(policy);
        }



        public async Task<IEnumerable<CustomerPolicyDto>> GetMyPoliciesAsync(int userId)
        {
            var customer = await _customerRepository.GetByUserIdAsync(userId);
            if (customer == null)
                throw new ArgumentException("Customer not found");

            var customerPolicies = await _customerPolicyRepository.GetByCustomerIdAsync(customer.Id);
            return _mapper.Map<IEnumerable<CustomerPolicyDto>>(customerPolicies);
        }

        public async Task<IEnumerable<ClaimDto>> GetMyClaimsAsync(int userId)
        {
            var customer = await _customerRepository.GetByUserIdAsync(userId);
            if (customer == null)
                throw new ArgumentException("Customer not found");

            return await _claimRepository.GetByCustomerIdAsync(customer.Id);
        }

        public async Task<IEnumerable<PaymentHistoryDto>> GetPaymentHistoryAsync(int userId)
        {
            var customer = await _customerRepository.GetByUserIdAsync(userId);
            if (customer == null)
                throw new ArgumentException("Customer not found");

            var payments = await _paymentRepository.GetByCustomerIdAsync(customer.Id);
            
            var result = payments.Select(p => {
                var policyName = p.CustomerPolicy?.Policy?.Name ?? "No Policy Found";
                Console.WriteLine($"Payment {p.Id}: PolicyName={policyName}, CustomerPolicyId={p.CustomerPolicyId}");
                return new PaymentHistoryDto
                {
                    Id = p.Id,
                    Amount = p.Amount,
                    TransactionDate = p.TransactionDate,
                    PaymentMethod = p.PaymentMethod ?? "N/A",
                    Status = p.Status,
                    PolicyName = policyName,
                    TransactionNumber = p.TransactionNumber,
                    PaymentType = p.PaymentType,
                    ClaimNumber = p.Claim?.ClaimNumber
                };
            }).ToList();
            
            Console.WriteLine($"Returning {result.Count} payments with policy names");
            return result;
        }

        public async Task<string> RenewPolicyAsync(int customerPolicyId, int userId, string paymentMethod, string transactionNumber)
        {
            // Validate transaction number format
            if (!IsValidTransactionNumber(transactionNumber))
                throw new ArgumentException("Invalid transaction number format. Please provide a valid transaction ID from your bank or payment gateway.");

            // Check for duplicate transaction numbers
            if (await _paymentRepository.TransactionExistsAsync(transactionNumber))
                throw new ArgumentException("This transaction number has already been used. Please provide a unique transaction ID.");

            var customer = await _customerRepository.GetByUserIdAsync(userId);
            if (customer == null)
                throw new ArgumentException("Customer not found");

            var customerPolicies = await _customerPolicyRepository.GetByCustomerIdAsync(customer.Id);
            var customerPolicy = customerPolicies.FirstOrDefault(cp => cp.Id == customerPolicyId);
            
            if (customerPolicy == null)
                throw new ArgumentException("Policy not found");

            if (customerPolicy.Status == PolicyStatus.Cancelled)
                throw new ArgumentException("Cannot renew a cancelled policy");

            if (customerPolicy.Status != PolicyStatus.Expired)
                throw new ArgumentException("Only expired policies can be renewed");

            var allClaims = await _claimRepository.GetAllAsync();
            var hasPaidClaimsForThisPolicy = allClaims.Any(c => 
                c.CustomerPolicyId == customerPolicyId && 
                c.Status == ClaimStatus.Paid);
            
            if (!hasPaidClaimsForThisPolicy)
                throw new ArgumentException("Policy renewal is only allowed after having paid claims for this specific policy");

            var newExpiryDate = customerPolicy.Status == PolicyStatus.Expired 
                ? DateTime.UtcNow.AddMonths(customerPolicy.Policy.DurationMonths)
                : customerPolicy.ExpiryDate.AddMonths(customerPolicy.Policy.DurationMonths);

            customerPolicy.ExpiryDate = newExpiryDate;
            customerPolicy.Status = PolicyStatus.Active;
            
            await _customerPolicyRepository.UpdateAsync(customerPolicy);

            var payment = new PaymentTransaction
            {
                CustomerPolicyId = customerPolicy.Id,
                Amount = customerPolicy.Policy.Premium,
                PaymentType = PaymentType.Premium,
                Status = PaymentStatus.Completed,
                TransactionNumber = transactionNumber,
                PaymentMethod = paymentMethod,
                Notes = "Policy Renewal"
            };

            await _paymentRepository.CreateAsync(payment);

            await _notificationService.CreateNotificationAsync(
                userId,
                "Policy Renewed",
                $"Your policy {customerPolicy.Policy.Name} has been renewed successfully until {newExpiryDate:yyyy-MM-dd}. Transaction ID: {transactionNumber}",
                NotificationType.PolicyPurchase
            );

            await _notificationService.CreateNotificationAsync(
                userId,
                "Renewal Payment Successful",
                $"Renewal payment of ₹{customerPolicy.Policy.Premium} completed successfully. Transaction ID: {transactionNumber}",
                NotificationType.PaymentReceived
            );

            return "Policy renewed successfully";
        }

        public async Task<string> PurchasePolicyAsync(PurchasePolicyDto purchaseDto, int userId)
        {
            try
            {
                if (!IsValidTransactionNumber(purchaseDto.TransactionNumber))
                    throw new ArgumentException("Invalid transaction number format. Please provide a valid transaction ID from your bank or payment gateway.");

           
                if (await _paymentRepository.TransactionExistsAsync(purchaseDto.TransactionNumber))
                    throw new ArgumentException("This transaction number has already been used. Please provide a unique transaction ID.");

                var customer = await _customerRepository.GetByUserIdAsync(userId);
                if (customer == null)
                    throw new ArgumentException($"Customer not found for userId: {userId}");

                var policy = await _policyRepository.GetByIdAsync(purchaseDto.PolicyId);
                if (policy == null)
                    throw new ArgumentException($"Policy not found with id: {purchaseDto.PolicyId}");
                    
                if (!policy.IsActive)
                    throw new ArgumentException($"Policy {purchaseDto.PolicyId} is not active");

                if (await _customerPolicyRepository.HasActivePolicyAsync(customer.Id, purchaseDto.PolicyId))
                    throw new ArgumentException("You already have an active policy of this type");

                var existingPolicies = await _customerPolicyRepository.GetByCustomerIdAsync(customer.Id);
                var previousPolicy = existingPolicies.FirstOrDefault(cp => cp.PolicyId == purchaseDto.PolicyId);
                
                if (previousPolicy != null)
                {
                   
                    var allClaims = await _claimRepository.GetAllAsync();
                    var hasPaidClaims = allClaims.Any(c => 
                        c.CustomerPolicyId == previousPolicy.Id && 
                        c.Status == ClaimStatus.Paid);
                    
                    if (!hasPaidClaims)
                        throw new ArgumentException("You can only purchase the same policy again after having paid claims on your previous policy.");
                }

                var policyNumber = $"POL{DateTime.Now:yyyyMMdd}{policy.PolicyType.ToString().ToUpper()[0]}{new Random().Next(100, 999)}";

              
                var calculatedPremium = CalculatePremium(policy, customer);

                var customerPolicy = new CustomerPolicy
                {
                    CustomerId = customer.Id,
                    PolicyId = purchaseDto.PolicyId,
                    PolicyNumber = policyNumber,
                    PurchaseDate = DateTime.UtcNow,
                    ExpiryDate = DateTime.UtcNow.AddMonths(policy.DurationMonths),
                    Status = PolicyStatus.Active
                };

                await _customerPolicyRepository.CreateAsync(customerPolicy);

                var payment = new PaymentTransaction
                {
                    CustomerPolicyId = customerPolicy.Id,
                    Amount = calculatedPremium.TotalAmount,
                    PaymentType = PaymentType.Premium,
                    Status = PaymentStatus.Completed,
                    TransactionNumber = purchaseDto.TransactionNumber,
                    PaymentMethod = purchaseDto.PaymentMethod,
                    Notes = $"Premium: ₹{calculatedPremium.BasePremium}, Age Factor: ₹{calculatedPremium.AgeFactor}, Medical: ₹{calculatedPremium.MedicalFactor}, GST: ₹{calculatedPremium.Gst}"
                };

                await _paymentRepository.CreateAsync(payment);

                await _notificationService.CreateNotificationAsync(
                    userId,
                    "Policy Purchased",
                    $"Policy activated! {policy.Name} purchased successfully. Policy Number: {policyNumber}. Premium paid: ₹{policy.Premium}",
                    NotificationType.PolicyPurchase
                );

                await _notificationService.CreateNotificationAsync(
                    userId,
                    "Payment Successful",
                    $"Payment of ₹{policy.Premium} completed successfully. Transaction ID: {purchaseDto.TransactionNumber}",
                    NotificationType.PaymentReceived
                );

                return "Policy purchased successfully";
            }
            catch (Exception ex)
            {
                throw new ArgumentException($"Purchase failed: {ex.Message}");
            }
        }



        private async Task<bool> HasSpecificPolicyAsync(int customerId, int policyId)
        {
            var customerPolicies = await _customerPolicyRepository.GetByCustomerIdAsync(customerId);
            return customerPolicies.Any(cp => cp.PolicyId == policyId);
        }

        public async Task<object> UpdateProfileAsync(int userId, UpdateCustomerProfileDto updateDto)
        {
            var customer = await _customerRepository.GetByUserIdAsync(userId);
            if (customer == null)
                throw new ArgumentException("Customer not found");

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                throw new ArgumentException("User not found");

            customer.FirstName = updateDto.FirstName;
            customer.LastName = updateDto.LastName;
            customer.Phone = updateDto.Phone;
            customer.Address = updateDto.Address;
            customer.DateOfBirth = updateDto.DateOfBirth;

            user.FirstName = updateDto.FirstName;
            user.LastName = updateDto.LastName;

            if (updateDto.ProfileImage != null)
            {
                var imageUrl = await _fileService.SaveProfileImageAsync(updateDto.ProfileImage, userId);
                user.ProfileImageUrl = imageUrl;
            }

            await _customerRepository.UpdateAsync(customer);
            await _userRepository.UpdateAsync(user);

            return "Profile updated successfully";
        }

        public async Task<object> GetPremiumQuoteAsync(int policyId, int userId)
        {
            var customer = await _customerRepository.GetByUserIdAsync(userId);
            if (customer == null)
                throw new ArgumentException("Customer not found");

            var policy = await _policyRepository.GetByIdAsync(policyId);
            if (policy == null || !policy.IsActive)
                throw new ArgumentException("Policy not found or inactive");

            var premiumCalculation = CalculatePremium(policy, customer);

            return new
            {
                PolicyId = policy.Id,
                PolicyName = policy.Name,
                CoverageAmount = policy.CoverageAmount,
                BasePremium = premiumCalculation.BasePremium,
                AgeFactor = premiumCalculation.AgeFactor,
                MedicalFactor = premiumCalculation.MedicalFactor,
                NetPremium = premiumCalculation.NetPremium,
                Gst = premiumCalculation.Gst,
                TotalAmount = premiumCalculation.TotalAmount,
                DurationMonths = policy.DurationMonths
            };
        }

        private static (int minAge, int maxAge) GetAgeEligibility(PolicyType policyType)
        {
            return policyType switch
            {
                PolicyType.Individual => (18, 65),
                PolicyType.Family => (18, 65),
                PolicyType.Senior => (60, 80),
                _ => (18, 65)
            };
        }

        private static bool IsValidTransactionNumber(string transactionNumber)
        {
            if (string.IsNullOrWhiteSpace(transactionNumber))
                return false;

            var patterns = new[]
            {
                @"^TXN\d{12,16}$",           
                @"^UTR\d{12}$",             
                @"^[A-Z0-9]{10,20}$",       
                @"^\d{12,16}$"              
            };

            return patterns.Any(pattern => System.Text.RegularExpressions.Regex.IsMatch(transactionNumber.ToUpper(), pattern));
        }

        private static PremiumCalculation CalculatePremium(Policy policy, Customer customer)
        {
          
            var today = DateTime.Today;
            var age = today.Year - customer.DateOfBirth.Year;
            if (customer.DateOfBirth.Date > today.AddYears(-age)) age--;

            var basePremium = (decimal)(policy.CoverageAmount * 0.015m);

           
            var ageFactor = age switch
            {
                < 25 => 200m,
                >= 25 and < 35 => 500m,
                >= 35 and < 45 => 800m,
                >= 45 and < 55 => 1200m,
                >= 55 => 1800m
            };

           
            var medicalFactor = policy.PolicyType switch
            {
                PolicyType.Individual => 300m,
                PolicyType.Family => 600m,
                PolicyType.Senior => 1000m,
                _ => 300m
            };

            var netPremium = basePremium + ageFactor + medicalFactor;
            var gst = netPremium * 0.18m;
            var totalAmount = netPremium + gst;

            return new PremiumCalculation
            {
                BasePremium = Math.Round(basePremium, 2),
                AgeFactor = ageFactor,
                MedicalFactor = medicalFactor,
                NetPremium = Math.Round(netPremium, 2),
                Gst = Math.Round(gst, 2),
                TotalAmount = Math.Round(totalAmount, 2)
            };
        }
    }

    public class PremiumCalculation
    {
        public decimal BasePremium { get; set; }
        public decimal AgeFactor { get; set; }
        public decimal MedicalFactor { get; set; }
        public decimal NetPremium { get; set; }
        public decimal Gst { get; set; }
        public decimal TotalAmount { get; set; }
    }
}