import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
        ('catalogue', '0002_catalogue_created_at_catalogue_thumbnail_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='catalogue',
            name='category_group',
            field=models.CharField(
                blank=True,
                choices=[('residential', 'Residential'), ('commercial', 'Commercial')],
                default='',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='catalogue',
            name='seller',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='catalogues',
                to='users.sellerprofile',
            ),
        ),
    ]
