using AutoMapper;
using HealthInsuranceClaimAPI.DTOs;
using HealthInsuranceClaimAPI.Models;
using HealthInsuranceClaimAPI.Enums;

namespace HealthInsuranceClaimAPI.Mappings
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {

            CreateMap<Policy, PolicyDto>();
            CreateMap<CreatePolicyRequest, Policy>();

 
            CreateMap<Claim, ClaimDto>()
                .ForMember(dest => dest.CustomerName, opt => opt.MapFrom(src => $"{src.CustomerPolicy.Customer.FirstName} {src.CustomerPolicy.Customer.LastName}"))
                .ForMember(dest => dest.HospitalName, opt => opt.MapFrom(src => src.Hospital.Name))
                .ForMember(dest => dest.ClaimOfficerName, opt => opt.MapFrom(src => src.ClaimOfficer != null ? $"{src.ClaimOfficer.FirstName} {src.ClaimOfficer.LastName}" : null))
                .ForMember(dest => dest.DocumentRequest, opt => opt.MapFrom(src => src.DocumentRequest));

     
            CreateMap<RegisterCustomerDto, User>()
                .ForMember(dest => dest.PasswordHash, opt => opt.Ignore())
                .ForMember(dest => dest.Role, opt => opt.MapFrom(src => UserRole.Customer));

            CreateMap<RegisterHospitalDto, User>()
                .ForMember(dest => dest.PasswordHash, opt => opt.Ignore())
                .ForMember(dest => dest.Role, opt => opt.MapFrom(src => UserRole.Hospital));

            CreateMap<AddClaimOfficerDto, User>()
                .ForMember(dest => dest.PasswordHash, opt => opt.Ignore())
                .ForMember(dest => dest.Role, opt => opt.MapFrom(src => UserRole.ClaimOfficer));

           
            CreateMap<RegisterCustomerDto, Customer>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.UserId, opt => opt.Ignore());

          
            CreateMap<RegisterHospitalDto, Hospital>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.UserId, opt => opt.Ignore());

         
            CreateMap<AddClaimOfficerDto, ClaimOfficer>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.UserId, opt => opt.Ignore());

            // CustomerPolicy mappings
            CreateMap<CustomerPolicy, CustomerPolicyDto>()
                .ForMember(dest => dest.CustomerName, opt => opt.MapFrom(src => $"{src.Customer.FirstName} {src.Customer.LastName}"))
                .ForMember(dest => dest.PolicyName, opt => opt.MapFrom(src => src.Policy.Name))
                .ForMember(dest => dest.CoverageAmount, opt => opt.MapFrom(src => src.Policy.CoverageAmount));

            // PaymentTransaction mappings
            CreateMap<PaymentTransaction, PaymentHistoryDto>()
                .ForMember(dest => dest.PolicyName, opt => opt.MapFrom(src => src.CustomerPolicy != null && src.CustomerPolicy.Policy != null ? src.CustomerPolicy.Policy.Name : null))
                .ForMember(dest => dest.ClaimNumber, opt => opt.MapFrom(src => src.Claim != null ? src.Claim.ClaimNumber : null));

            // Notification mappings
            CreateMap<Notification, NotificationDto>();
        }
    }
}