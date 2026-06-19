using System.ComponentModel.DataAnnotations;
using HealthInsuranceClaimAPI.DTOs;
using Xunit;

namespace HealthInsuranceClaimAPI.Tests;

public class RegisterCustomerDtoTests
{
    [Fact]
    public void ValidateAge_RejectsUnder18()
    {
        var dob = DateTime.Today.AddYears(-17);
        var result = RegisterCustomerDto.ValidateAge(dob, new ValidationContext(new RegisterCustomerDto()));

        Assert.NotNull(result);
        Assert.Contains("18", result!.ErrorMessage, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ValidateAge_AcceptsAdult()
    {
        var dob = DateTime.Today.AddYears(-25);
        var result = RegisterCustomerDto.ValidateAge(dob, new ValidationContext(new RegisterCustomerDto()));

        Assert.Null(result);
    }
}
