# Generated by Django 5.2 on 2025-05-31 04:39

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('diagnostics', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='diagnosticresult',
            name='diagnostic_type',
            field=models.CharField(choices=[('malaria', 'Malaria Detection'), ('disease', 'Disease Prediction'), ('enhanced', 'Enhanced Disease Prediction'), ('completed', 'Completed Enhanced Prediction')], max_length=100),
        ),
    ]
