import catalogue.models
import catalogue.validators
from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalogue', '0004_category_catalogue_status'),
    ]

    operations = [
        migrations.RenameField(
            model_name='catalogue',
            old_name='designs',
            new_name='plan_file',
        ),
        migrations.AlterField(
            model_name='catalogue',
            name='plan_file',
            field=models.FileField(blank=True, null=True, upload_to=catalogue.models.plan_file_upload_path, validators=[catalogue.validators.validate_plan_file]),
        ),
        migrations.AlterField(
            model_name='catalogue',
            name='price',
            field=models.DecimalField(decimal_places=4, max_digits=19, validators=[MinValueValidator(Decimal('0.01'))]),
        ),
        migrations.AlterField(
            model_name='catalogue',
            name='thumbnail',
            field=models.ImageField(blank=True, null=True, upload_to=catalogue.models.thumbnail_upload_path, validators=[catalogue.validators.validate_thumbnail_file]),
        ),
    ]
