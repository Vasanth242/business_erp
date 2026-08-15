from django.db import migrations, models
import django.db.models.deletion


def copy_category_master_to_new_category(
    apps,
    schema_editor,
):
    Expense = apps.get_model(
        "expenses",
        "Expense",
    )

    for expense in Expense.objects.all():

        if expense.category_master_id:

            expense.category_new_id = (
                expense.category_master_id
            )

            expense.save(
                update_fields=[
                    "category_new",
                ]
            )


class Migration(
    migrations.Migration
):

    dependencies = [
        (
            "expenses",
            "0003_expense_category_master",
        ),
    ]

    operations = [

        migrations.AddField(
            model_name="expense",
            name="category_new",
            field=models.ForeignKey(
                to="expenses.expensecategory",
                on_delete=django.db.models.deletion.PROTECT,
                null=True,
                blank=True,
                related_name="+",
            ),
        ),

        migrations.RunPython(
            copy_category_master_to_new_category,
            migrations.RunPython.noop,
        ),

        migrations.RemoveField(
            model_name="expense",
            name="category_master",
        ),

        migrations.RemoveField(
            model_name="expense",
            name="category",
        ),

        migrations.RenameField(
            model_name="expense",
            old_name="category_new",
            new_name="category",
        ),

        migrations.AlterField(
            model_name="expense",
            name="category",
            field=models.ForeignKey(
                to="expenses.expensecategory",
                on_delete=django.db.models.deletion.PROTECT,
                related_name="expenses",
            ),
        ),
    ]