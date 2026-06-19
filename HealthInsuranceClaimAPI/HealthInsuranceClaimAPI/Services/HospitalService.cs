using AutoMapper;
using Microsoft.EntityFrameworkCore;
using HealthInsuranceClaimAPI.DTOs;
using HealthInsuranceClaimAPI.Enums;
using HealthInsuranceClaimAPI.Interfaces.IRepository;
using HealthInsuranceClaimAPI.Interfaces.IService;
using HealthInsuranceClaimAPI.Models;
using HealthInsuranceClaimAPI.Data;

namespace HealthInsuranceClaimAPI.Services
{
    public class HospitalService : IHospitalService
    {
        private readonly IClaimRepository _claimRepository;
        private readonly IHospitalRepository _hospitalRepository;
        private readonly ICustomerPolicyRepository _customerPolicyRepository;
        private readonly IClaimDocumentRepository _claimDocumentRepository;
        private readonly INotificationService _notificationService;
        private readonly IFileService _fileService;
        private readonly HealthInsuranceContext _context;
        private readonly IMapper _mapper;

        public HospitalService(
            IClaimRepository claimRepository,
            IHospitalRepository hospitalRepository,
            ICustomerPolicyRepository customerPolicyRepository,
            IClaimDocumentRepository claimDocumentRepository,
            INotificationService notificationService,
            IFileService fileService,
            HealthInsuranceContext context,
            IMapper mapper)
        {
            _claimRepository = claimRepository;
            _hospitalRepository = hospitalRepository;
            _customerPolicyRepository = customerPolicyRepository;
            _claimDocumentRepository = claimDocumentRepository;
            _notificationService = notificationService;
            _fileService = fileService;
            _context = context;
            _mapper = mapper;
        }

        public async Task<string> SubmitClaimAsync(CreateClaimDto createClaimDto, int userId)
        {
            var hospital = await _hospitalRepository.GetByUserIdAsync(userId);
            if (hospital == null)
                throw new ArgumentException("Hospital not found");

            var customerPolicy = await _context.CustomerPolicies
                .Include(cp => cp.Customer)
                .Include(cp => cp.Policy)
                .FirstOrDefaultAsync(cp => cp.PolicyNumber == createClaimDto.PolicyNumber);
            if (customerPolicy == null || customerPolicy.Status != PolicyStatus.Active)
                throw new ArgumentException("Customer policy not found or inactive");

            var existingClaim = await _context.Claims
                .Where(c => c.CustomerPolicyId == customerPolicy.Id)
                .Where(c => c.Status == ClaimStatus.Submitted || 
                           c.Status == ClaimStatus.UnderReview || 
                           c.Status == ClaimStatus.DocumentsRequested || 
                           c.Status == ClaimStatus.Approved || 
                           c.Status == ClaimStatus.Paid)
                .FirstOrDefaultAsync();

            if (existingClaim != null)
            {
                if (existingClaim.Status == ClaimStatus.Approved || existingClaim.Status == ClaimStatus.Paid)
                    throw new ArgumentException("This policy already has an approved claim. No further claims allowed.");
                else
                    throw new ArgumentException("This policy already has a pending claim. Please wait for it to be processed.");
            }


            if (createClaimDto.Documents.Count != createClaimDto.DocumentTypes.Count)
                throw new ArgumentException("Document count must match document type count");

            var claimNumber = $"CLM{DateTime.Now:yyyyMMdd}{new Random().Next(1000, 9999)}";

            var claim = new Claim
            {
                CustomerPolicyId = customerPolicy.Id,
                HospitalId = hospital.Id,
                ClaimNumber = claimNumber,
                ClaimAmount = createClaimDto.ClaimAmount,
                TreatmentDetails = createClaimDto.TreatmentDetails,
                TreatmentDate = createClaimDto.TreatmentDate
            };

            await _claimRepository.CreateAsync(claim);

            for (int i = 0; i < createClaimDto.Documents.Count; i++)
            {
                var filePath = await _fileService.SaveFileAsync(createClaimDto.Documents[i], createClaimDto.DocumentTypes[i]);
                
                var document = new ClaimDocument
                {
                    ClaimId = claim.Id,
                    FileName = createClaimDto.Documents[i].FileName,
                    FilePath = filePath,
                    DocumentType = createClaimDto.DocumentTypes[i]
                };
                
                await _claimDocumentRepository.CreateAsync(document);
            }

            await _notificationService.CreateNotificationAsync(
                customerPolicy.Customer.UserId,
                "Claim Submitted",
                $"A claim has been submitted for your policy. Claim Number: {claimNumber}",
                NotificationType.ClaimSubmitted
            );

         
            var admins = await _context.Users.Where(u => u.Role == UserRole.Admin).ToListAsync();
            foreach (var admin in admins)
            {
                await _notificationService.CreateNotificationAsync(
                    admin.Id,
                    "New Claim Submitted",
                    $"New claim {claimNumber} submitted by {hospital.Name} for ₹{createClaimDto.ClaimAmount}",
                    NotificationType.ClaimSubmitted
                );
            }

            return "Claim submitted successfully";
        }

        public async Task<IEnumerable<ClaimDto>> GetMyClaimsAsync(int userId)
        {
            var hospital = await _hospitalRepository.GetByUserIdAsync(userId);
            if (hospital == null)
                throw new ArgumentException("Hospital not found");

            var claims = await _context.Claims
                .Where(c => c.HospitalId == hospital.Id)
                .Include(c => c.Hospital)
                .Include(c => c.CustomerPolicy)
                    .ThenInclude(cp => cp.Customer)
                .Include(c => c.ClaimOfficer)
                .ToListAsync();
            
            return _mapper.Map<IEnumerable<ClaimDto>>(claims);
        }

        public async Task<CustomerPolicyDto> GetCustomerPolicyAsync(string policyNumber)
        {
            var customerPolicy = await _context.CustomerPolicies
                .Include(cp => cp.Customer)
                .Include(cp => cp.Policy)
                .FirstOrDefaultAsync(cp => cp.PolicyNumber == policyNumber);
            
            if (customerPolicy == null)
                throw new ArgumentException($"Policy number '{policyNumber}' not found");
                
            if (customerPolicy.Status != PolicyStatus.Active)
                throw new ArgumentException($"Policy '{policyNumber}' is not active. Current status: {customerPolicy.Status}");

            return new CustomerPolicyDto
            {
                Id = customerPolicy.Id,
                CustomerName = $"{customerPolicy.Customer.FirstName} {customerPolicy.Customer.LastName}",
                PolicyName = customerPolicy.Policy.Name,
                CoverageAmount = customerPolicy.Policy.CoverageAmount,
                PremiumAmount = customerPolicy.Policy.Premium,
                PurchaseDate = customerPolicy.PurchaseDate,
                ExpiryDate = customerPolicy.ExpiryDate,
                Status = customerPolicy.Status,
                PolicyNumber = customerPolicy.PolicyNumber
            };
        }

        public async Task<IEnumerable<CustomerPolicyDto>> GetCustomerPoliciesAsync(int customerId)
        {
            var customerPolicies = await _context.CustomerPolicies
                .Include(cp => cp.Customer)
                .Include(cp => cp.Policy)
                .Where(cp => cp.CustomerId == customerId && cp.Status == PolicyStatus.Active)
                .Select(cp => new CustomerPolicyDto
                {
                    Id = cp.Id,
                    CustomerName = $"{cp.Customer.FirstName} {cp.Customer.LastName}",
                    PolicyName = cp.Policy.Name,
                    CoverageAmount = cp.Policy.CoverageAmount,
                    PremiumAmount = cp.Policy.Premium,
                    PurchaseDate = cp.PurchaseDate,
                    ExpiryDate = cp.ExpiryDate,
                    Status = cp.Status,
                    PolicyNumber = cp.PolicyNumber
                })
                .ToListAsync();

            return customerPolicies;
        }

        public async Task<IEnumerable<ClaimDto>> GetClaimsByStatusAsync(int userId, string status)
        {
            var hospital = await _hospitalRepository.GetByUserIdAsync(userId);
            if (hospital == null)
                throw new ArgumentException("Hospital not found");

            IQueryable<Claim> query = _context.Claims
                .Where(c => c.HospitalId == hospital.Id)
                .Include(c => c.Hospital)
                .Include(c => c.CustomerPolicy)
                    .ThenInclude(cp => cp.Customer)
                .Include(c => c.ClaimOfficer);

            if (Enum.TryParse<ClaimStatus>(status, true, out var claimStatus))
            {
                query = query.Where(c => c.Status == claimStatus);
            }

            var claims = await query.ToListAsync();
            return _mapper.Map<IEnumerable<ClaimDto>>(claims);
        }

        public async Task<string> UploadAdditionalDocumentsAsync(int claimId, List<IFormFile> documents, List<string> documentTypes, int userId)
        {
            var hospital = await _hospitalRepository.GetByUserIdAsync(userId);
            if (hospital == null)
                throw new ArgumentException("Hospital not found");

            var claim = await _context.Claims
                .Include(c => c.Hospital)
                .FirstOrDefaultAsync(c => c.Id == claimId);
            if (claim == null)
                throw new ArgumentException("Claim not found");

            if (claim.HospitalId != hospital.Id)
                throw new ArgumentException("You can only upload documents for your own claims");

            if (claim.Status != ClaimStatus.DocumentsRequested)
                throw new ArgumentException("Documents can only be uploaded for claims with documents requested status");

            if (documents.Count != documentTypes.Count)
                throw new ArgumentException("Document count must match document type count");

            for (int i = 0; i < documents.Count; i++)
            {
                var filePath = await _fileService.SaveFileAsync(documents[i], documentTypes[i]);
                
                var document = new ClaimDocument
                {
                    ClaimId = claimId,
                    FileName = documents[i].FileName,
                    FilePath = filePath,
                    DocumentType = documentTypes[i]
                };
                
                await _claimDocumentRepository.CreateAsync(document);
            }

         
            claim.Status = ClaimStatus.UnderReview;
           
            claim.ClaimOfficerId = null;
            await _claimRepository.UpdateAsync(claim);

            if (claim.ClaimOfficerId.HasValue)
            {
                var claimOfficer = await _context.ClaimOfficers
                    .Include(co => co.User)
                    .FirstOrDefaultAsync(co => co.Id == claim.ClaimOfficerId.Value);
                
                if (claimOfficer != null)
                {
                    await _notificationService.CreateNotificationAsync(
                        claimOfficer.UserId,
                        "Additional Documents Uploaded",
                        $"Hospital has uploaded additional documents for claim {claim.ClaimNumber}. Ready for review.",
                        NotificationType.ClaimStatusUpdate
                    );
                }
            }

            return "Additional documents uploaded successfully";
        }

        public async Task<ProfileResponseDto> GetProfileAsync(int userId)
        {
            var user = await _context.Users
                .Include(u => u.Hospital)
                .FirstOrDefaultAsync(u => u.Id == userId);
            
            if (user == null)
                throw new ArgumentException("User not found");

            return new ProfileResponseDto
            {
                Id = user.Id,
                Email = user.Email,
                Role = (int)user.Role,
                FirstName = !string.IsNullOrEmpty(user.Hospital?.FirstName) ? user.Hospital.FirstName : "Hospital",
                LastName = !string.IsNullOrEmpty(user.Hospital?.LastName) ? user.Hospital.LastName : "Contact",
                ProfileImageUrl = user.ProfileImageUrl,
                IsActive = user.IsActive,
                Hospital = user.Hospital != null ? new HospitalProfileDto
                {
                    Name = user.Hospital.Name,
                    LicenseNumber = user.Hospital.LicenseNumber,
                    Address = user.Hospital.Address,
                    ContactNumber = user.Hospital.ContactNumber
                } : null
            };
        }

        public async Task<string> UpdateProfileAsync(int userId, UpdateHospitalProfileDto updateDto)
        {
            var user = await _context.Users
                .Include(u => u.Hospital)
                .FirstOrDefaultAsync(u => u.Id == userId);
            
            if (user == null)
                throw new ArgumentException("User not found");

            user.FirstName = updateDto.FirstName;
            user.LastName = updateDto.LastName;

            if (user.Hospital != null)
            {
                user.Hospital.Name = updateDto.Name;
                user.Hospital.Address = updateDto.Address;
                user.Hospital.ContactNumber = updateDto.ContactNumber;
            }

            if (updateDto.ProfileImage != null)
            {
                user.ProfileImageUrl = await _fileService.SaveProfileImageAsync(updateDto.ProfileImage, userId);
            }

            await _context.SaveChangesAsync();
            return "Profile updated successfully";
        }
    }
}