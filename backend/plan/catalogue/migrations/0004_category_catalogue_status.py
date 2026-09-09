from django.db import migrations, models
import django.db.models.deletion


def migrate_categories(apps, schema_editor):
    Category = apps.get_model('catalogue', 'Category')
    Catalogue = apps.get_model('catalogue', 'Catalogue')
    valid_groups = {'residential', 'commercial'}

    for listing in Catalogue.objects.all().iterator():
        name = (listing.category or '').strip() or 'Uncategorised'
        group = listing.category_group if listing.category_group in valid_groups else 'other'
        category, _ = Category.objects.get_or_create(name=name, defaults={'group': group})
        listing.category_relation = category
        listing.save(update_fields=['category_relation'])


class Migration(migrations.Migration):

    dependencies = [
        ('catalogue', '0003_catalogue_category_group_catalogue_seller'),
    ]

    operations = [
        migrations.CreateModel(
            name='Category',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True)),
                ('group', models.CharField(choices=[('residential', 'Residential'), ('commercial', 'Commercial'), ('other', 'Other')], max_length=20)),
                ('is_active', models.BooleanField(default=True)),
            ],
        ),
        migrations.AddField(
            model_name='catalogue',
            name='category_relation',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='+', to='catalogue.category'),
        ),
        migrations.RunPython(migrate_categories, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='catalogue',
            name='category',
        ),
        migrations.RemoveField(
            model_name='catalogue',
            name='category_group',
        ),
        migrations.RenameField(
            model_name='catalogue',
            old_name='category_relation',
            new_name='category',
        ),
        migrations.AlterField(
            model_name='catalogue',
            name='category',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='catalogues', to='catalogue.category'),
        ),
        migrations.AddField(
            model_name='catalogue',
            name='status',
            field=models.CharField(choices=[('draft', 'Draft'), ('in_review', 'In review'), ('published', 'Published')], db_index=True, default='draft', max_length=20),
        ),
    ]
