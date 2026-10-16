def _plain_number(value):
    """100.0 -> '100', 170.24 -> '170.24' (other values are left as they are)."""
    if isinstance(value, float):
        return f"{value:.2f}".rstrip("0").rstrip(".")
    return str(value)


def _with_amount(amount, name):
    """'Fam' + amount 100 -> '100 Fam'. Left alone if amount is 0 or already in the name."""
    try:
        if float(amount) == 0:
            return name
    except (TypeError, ValueError):
        return name
    plain = _plain_number(amount)
    if str(name).strip().startswith(plain):
        return name
    return f"{plain} {name}"


def build_package_label(
    amount,
    package_name=None,
    currency_name=None,
):
    """Text shown for a package: package name, else '<currency> <amount>'.

    The currency name always comes from the game_currencies table, so
    changing it in the database changes what the site shows.
    """
    if package_name:
        return _with_amount(amount, package_name)

    if currency_name:
        return f"{currency_name} {_plain_number(amount)}"

    return _plain_number(amount)
