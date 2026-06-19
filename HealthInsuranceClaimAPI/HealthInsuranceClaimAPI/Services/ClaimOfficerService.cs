using AutoMapper;
using HealthInsuranceClaimAPI.DTOs;
using HealthInsuranceClaimAPI.Enums;
using HealthInsuranceClaimAPI.Interfaces.IRepository;
using HealthInsuranceClaimAPI.Interfaces.IService;
using HealthInsuranceClaimAPI.Models;

namespace HealthInsuranceClaimAPI.Services
{
    public class ClaimOfficerService : IClaimOfficerService
    {
        private readonly IClaimRepository _claimRepository;
        private readonly IClaimOfficerRepository _claimOfficerRepository;
        private readonly IPaymentTransactionRepository _paymentRepository;
        private readonly IClaimDocumentRepository _claimDocumentRepository;
        private readonly INotificationService _notificationService;
        private readonly IMapper _mapper;

        public ClaimOfficerService(
            IClaimRepository claimRepository,
            IClaimOfficerRepository claimOfficerRepository,
            IPaymentTransactionRepository paymentRepository,
            IClaimDocumentRepository claimDocumentRepository,
            INotificationService notificationService,
            IMapper mapper)
        {
            _claimRepository = claimRepository;
            _claimOfficerRepository = claimOfficerRepository;
            _paymentRepository = paymentRepository;
            _claimDocumentRepository = claimDocumentRepository;
            _notificationService = notificationService;
            _mapper = mapper;
        }

        public async Task<IEnumerable<ClaimDto>> GetPendingClaimsAsync(int userId)
        {
            var claimOfficer = await _claimOfficerRepository.GetByUserIdAsync(userId);
            if (claimOfficer == null)
                throw new ArgumentException("Claim officer not found");           
            var assignedClaims = await _claimRepository.GetPendingClaimsByOfficerIdAsync(claimOfficer.Id);
            var unassignedClaims = await _claimRepository.GetUnassignedPendingAsync();            
            return assignedClaims.Concat(unassignedClaims);
        }

        public async Task<IEnumerable<ClaimDto>> GetAllClaimsAsync(int userId)
        {
            var claimOfficer = await _claimOfficerRepository.GetByUserIdAsync(userId);
            if (claimOfficer == null)
                throw new ArgumentException("Claim officer not found");
            return await _claimRepository.GetAllClaimsAsync();
        }

        public async Task<ClaimDto> GetClaimDetailsAsync(int claimId)
        {
            var claim = await _claimRepository.GetByIdAsync(claimId);
            if (claim == null)
                throw new ArgumentException("Claim not found");
            return _mapper.Map<ClaimDto>(claim);
        }

        public async Task<string> ApproveClaimAsync(int claimId, decimal? approvedAmount, int userId)
        {
            var claimOfficer = await _claimOfficerRepository.GetByUserIdAsync(userId);
            if (claimOfficer == null)
                throw new ArgumentException("Claim officer not found");

            var claim = await _claimRepository.GetByIdWithIncludesAsync(claimId);
            if (claim == null)
                throw new ArgumentException("Claim not found");

            if (claim.ClaimOfficerId == null)
                throw new ArgumentException("Claim has not been assigned to any officer");

            if (claim.ClaimOfficerId != claimOfficer.Id)
                throw new ArgumentException("You are not authorized to process this claim");

            if (claim.Status != ClaimStatus.Submitted && claim.Status != ClaimStatus.UnderReview)
                throw new ArgumentException("Claim must be in submitted or under review status");

            var finalAmount = approvedAmount ?? await CalculateApprovedAmountAsync(claimId, claim.ClaimAmount);

            claim.ClaimOfficerId = claimOfficer.Id;
            claim.Status = ClaimStatus.Approved;
            claim.ApprovedAmount = finalAmount;
            claim.ProcessedDate = DateTime.UtcNow;

            await _claimRepository.UpdateAsync(claim);

            await _notificationService.CreateNotificationAsync(
                claim.CustomerPolicy.Customer.UserId,
                "Claim Approved",
                $"Your claim {claim.ClaimNumber} has been approved for ₹{finalAmount}",
                NotificationType.ClaimStatusUpdate
            );

            await _notificationService.CreateNotificationAsync(
                claim.Hospital.UserId,
                "Claim Approved",
                $"Claim {claim.ClaimNumber} has been approved for ₹{finalAmount}",
                NotificationType.ClaimStatusUpdate
            );

            return "Claim approved successfully";
        }

        public async Task<string> RejectClaimAsync(int claimId, string rejectionReason, int userId)
        {
            var claimOfficer = await _claimOfficerRepository.GetByUserIdAsync(userId);
            if (claimOfficer == null)
                throw new ArgumentException("Claim officer not found");

            var claim = await _claimRepository.GetByIdWithIncludesAsync(claimId);
            if (claim == null)
                throw new ArgumentException("Claim not found");

            if (claim.ClaimOfficerId == null)
                throw new ArgumentException("Claim has not been assigned to any officer");

            if (claim.ClaimOfficerId != claimOfficer.Id)
                throw new ArgumentException("You are not authorized to process this claim");

            if (claim.Status != ClaimStatus.Submitted && claim.Status != ClaimStatus.UnderReview)
                throw new ArgumentException("Claim must be in submitted or under review status");

            if (string.IsNullOrEmpty(rejectionReason))
                throw new ArgumentException("Rejection reason is required");

            claim.ClaimOfficerId = claimOfficer.Id;
            claim.Status = ClaimStatus.Rejected;
            claim.RejectionReason = rejectionReason;
            claim.ProcessedDate = DateTime.UtcNow;

            await _claimRepository.UpdateAsync(claim);

            await _notificationService.CreateNotificationAsync(
                claim.CustomerPolicy.Customer.UserId,
                "Claim Rejected",
                $"Your claim {claim.ClaimNumber} has been rejected. Reason: {rejectionReason}",
                NotificationType.ClaimStatusUpdate
            );

            await _notificationService.CreateNotificationAsync(
                claim.Hospital.UserId,
                "Claim Rejected",
                $"Claim {claim.ClaimNumber} has been rejected. Reason: {rejectionReason}",
                NotificationType.ClaimStatusUpdate
            );

            return "Claim rejected successfully";
        }

        public async Task<string> RequestDocumentsAsync(int claimId, string documentRequest, int userId)
        {
            Console.WriteLine($"RequestDocumentsAsync called with claimId: {claimId}, documentRequest: '{documentRequest}', userId: {userId}");
            
            var claimOfficer = await _claimOfficerRepository.GetByUserIdAsync(userId);
            if (claimOfficer == null)
                throw new ArgumentException("Claim officer not found");

            var claim = await _claimRepository.GetByIdWithIncludesAsync(claimId);
            if (claim == null)
                throw new ArgumentException("Claim not found");

            if (claim.Status != ClaimStatus.Submitted && claim.Status != ClaimStatus.UnderReview && claim.Status != ClaimStatus.DocumentsRequested)
                throw new ArgumentException("Documents can only be requested for submitted, under review, or already requested claims");

            claim.ClaimOfficerId = claimOfficer.Id;
            claim.Status = ClaimStatus.DocumentsRequested;
            claim.DocumentRequest = documentRequest;
            claim.ProcessedDate = DateTime.UtcNow;

            Console.WriteLine($"Setting DocumentRequest to: '{documentRequest}'");
            await _claimRepository.UpdateAsync(claim);
            Console.WriteLine($"Claim updated successfully");

            if (claim.Hospital != null)
            {
                await _notificationService.CreateNotificationAsync(
                    claim.Hospital.UserId,
                    "Additional Documents Required",
                    $"Additional documents required for claim {claim.ClaimNumber}: {documentRequest}",
                    NotificationType.ClaimStatusUpdate
                );
            }

            return "Document request sent successfully";
        }

        public async Task<decimal> CalculateApprovedAmountAsync(int claimId, decimal requestedAmount)
        {
            var claim = await _claimRepository.GetByIdWithIncludesAsync(claimId);
            if (claim == null)
                throw new ArgumentException("Claim not found");

            var coveragePercentage = claim.CustomerPolicy.Policy.PolicyType switch
            {
                PolicyType.Individual => 0.80m, 
                PolicyType.Family => 0.75m,     
                PolicyType.Senior => 0.90m,     
                _ => 0.80m
            };

            var maxCoverage = claim.CustomerPolicy.Policy.CoverageAmount;
            var calculatedAmount = requestedAmount * coveragePercentage;

            return Math.Min(calculatedAmount, maxCoverage);
        }

        public async Task<string> ProcessPaymentAsync(int claimId, int userId)
        {
            var claimOfficer = await _claimOfficerRepository.GetByUserIdAsync(userId);
            if (claimOfficer == null)
                throw new ArgumentException("Claim officer not found");

            var claim = await _claimRepository.GetByIdWithIncludesAsync(claimId);
            if (claim == null)
                throw new ArgumentException("Claim not found");

            if (claim.Status != ClaimStatus.Approved)
                throw new ArgumentException("Claim must be approved before payment");

            if (!claim.ApprovedAmount.HasValue)
                throw new ArgumentException("Approved amount not set");

            var transactionId = $"TXN{DateTime.Now:yyyyMMddHHmmss}{new Random().Next(100, 999)}";


            var payment = new PaymentTransaction
            {
                ClaimId = claimId,
                Amount = claim.ApprovedAmount.Value,
                PaymentType = PaymentType.ClaimPayoutToHospital,
                Status = PaymentStatus.Completed,
                TransactionNumber = transactionId,
                PaymentMethod = "Bank Transfer",
                Notes = $"Claim payout for {claim.ClaimNumber}"
            };

            await _paymentRepository.CreateAsync(payment);

            claim.Status = ClaimStatus.Paid;
            await _claimRepository.UpdateAsync(claim);

     
            await _notificationService.CreateNotificationAsync(
                claim.Hospital.UserId,
                "Payment Processed",
                $"Payment of ₹{claim.ApprovedAmount} has been transferred for claim {claim.ClaimNumber}. Transaction ID: {transactionId}",
                NotificationType.PaymentReceived
            );

            await _notificationService.CreateNotificationAsync(
                claim.CustomerPolicy.Customer.UserId,
                "Claim Payment Completed",
                $"Your claim {claim.ClaimNumber} payment of ₹{claim.ApprovedAmount} has been processed. Transaction ID: {transactionId}",
                NotificationType.PaymentReceived
            );

            return "Payment processed successfully";
        }

        public async Task<IEnumerable<ClaimDocumentDto>> GetClaimDocumentsAsync(int claimId)
        {
            var claim = await _claimRepository.GetByIdAsync(claimId);
            if (claim == null)
                throw new ArgumentException("Claim not found");

            var documents = await _claimDocumentRepository.GetByClaimIdAsync(claimId);
            return documents.Select(d => new ClaimDocumentDto
            {
                Id = d.Id,
                FileName = d.FileName,
                DocumentType = d.DocumentType,
                UploadedAt = d.UploadedAt
            });
        }

        public async Task<DocumentDownloadDto> DownloadDocumentAsync(int documentId)
        {
            var document = await _claimDocumentRepository.GetByIdAsync(documentId);
            if (document == null)
                throw new ArgumentException("Document not found");

            if (!File.Exists(document.FilePath))
                throw new ArgumentException("File not found on server");

            var fileBytes = await File.ReadAllBytesAsync(document.FilePath);
            return new DocumentDownloadDto
            {
                FileBytes = fileBytes,
                FileName = document.FileName,
                ContentType = GetContentType(document.FileName)
            };
        }

        private static string GetContentType(string fileName)
        {
            var extension = Path.GetExtension(fileName).ToLowerInvariant();
            return extension switch
            {
                ".pdf" => "application/pdf",
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".doc" => "application/msword",
                ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                _ => "application/octet-stream"
            };
        }

        public async Task<ProfileResponseDto> GetProfileAsync(int userId)
        {
            var user = await _claimOfficerRepository.GetUserWithClaimOfficerAsync(userId);
            if (user == null)
                throw new ArgumentException("User not found");

         
            string firstName = null;
            string lastName = null;
            
            if (user.ClaimOfficer != null)
            {
                firstName = user.ClaimOfficer.FirstName;
                lastName = user.ClaimOfficer.LastName;
            }
            
        
            if (string.IsNullOrEmpty(firstName))
                firstName = user.FirstName;
            if (string.IsNullOrEmpty(lastName))
                lastName = user.LastName;

            return new ProfileResponseDto
            {
                Id = user.Id,
                Email = user.Email,
                Role = (int)user.Role,
                FirstName = firstName,
                LastName = lastName,
                ProfileImageUrl = user.ProfileImageUrl,
                IsActive = user.IsActive
            };
        }

        public async Task<string> UpdateProfileAsync(int userId, UpdateClaimOfficerProfileDto updateDto)
        {
            var user = await _claimOfficerRepository.GetUserWithClaimOfficerAsync(userId);
            if (user == null)
                throw new ArgumentException("User not found");

            user.FirstName = updateDto.FirstName;
            user.LastName = updateDto.LastName;

            if (user.ClaimOfficer != null)
            {
                user.ClaimOfficer.FirstName = updateDto.FirstName;
                user.ClaimOfficer.LastName = updateDto.LastName;
            }

            await _claimOfficerRepository.UpdateUserAsync(user);
            return "Profile updated successfully";
        }
    }
}