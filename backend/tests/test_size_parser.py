import pytest
from app.core.errors import InvalidTargetSizeError
from app.services.size_parser import (
    parse_size_string,
    parse_size_components,
    parse_target_input,
    format_bytes
)

def test_parse_valid_size_strings():
    assert parse_size_string("500 KB") == 500 * 1024
    assert parse_size_string("1 MB") == 1024 * 1024
    assert parse_size_string("2.5 MB") == int(2.5 * 1024 * 1024)
    assert parse_size_string("0.5 MB") == int(0.5 * 1024 * 1024)
    assert parse_size_string("100 KB") == 100 * 1024
    assert parse_size_string("1 GB") == 1024 * 1024 * 1024
    assert parse_size_string("1024 B") == 1024
    assert parse_size_string("500kb") == 500 * 1024
    assert parse_size_string("1.5mb") == int(1.5 * 1024 * 1024)

def test_parse_valid_components():
    assert parse_size_components(500, "KB") == 500 * 1024
    assert parse_size_components(1.5, "MB") == int(1.5 * 1024 * 1024)
    assert parse_size_components(2, "GB") == 2 * 1024 * 1024 * 1024
    assert parse_size_components(100, "B") == 100

def test_parse_target_input_unified():
    assert parse_target_input(target_size_str="300 KB") == 300 * 1024
    assert parse_target_input(target_value=2.0, target_unit="MB") == 2 * 1024 * 1024
    assert parse_target_input() is None

def test_invalid_values():
    with pytest.raises(InvalidTargetSizeError):
        parse_size_string("-500 KB")
        
    with pytest.raises(InvalidTargetSizeError):
        parse_size_string("0 MB")
        
    with pytest.raises(InvalidTargetSizeError):
        parse_size_string("abc KB")
        
    with pytest.raises(InvalidTargetSizeError):
        parse_size_components(-10, "MB")

    with pytest.raises(InvalidTargetSizeError):
        parse_size_components(0, "KB")

def test_unsupported_units():
    with pytest.raises(InvalidTargetSizeError):
        parse_size_string("500 TB")
        
    with pytest.raises(InvalidTargetSizeError):
        parse_size_components(100, "TERABYTE")

def test_format_bytes():
    assert format_bytes(500) == "500 B"
    assert "KB" in format_bytes(500 * 1024)
    assert "MB" in format_bytes(2 * 1024 * 1024)
    assert "GB" in format_bytes(3 * 1024 * 1024 * 1024)
