from django.contrib.admin.models import CHANGE, LogEntry
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import PermissionDenied
from django.db import transaction
from rest_framework.exceptions import ValidationError
from .models import User


def require_operator(actor):
    if not (actor.is_authenticated and actor.is_active and
            (actor.is_superuser or actor.role == User.UserChoices.ADMIN)):
        raise PermissionDenied('An active marketplace administrator is required.')


def record_operation(actor, obj, message):
    LogEntry.objects.create(
        user_id=actor.pk, content_type=ContentType.objects.get_for_model(obj),
        object_id=str(obj.pk), object_repr=str(obj)[:200],
        action_flag=CHANGE, change_message=message,
    )


@transaction.atomic
def set_designer_active(*, actor, designer_id, active):
    require_operator(actor)
    designer = User.objects.select_for_update().get(pk=designer_id)
    if designer.role != User.UserChoices.SELLER or designer.is_staff or designer.is_superuser:
        raise ValidationError('Select an ordinary designer account, not a staff account.')
    if designer.pk == actor.pk:
        raise ValidationError('You cannot suspend your own account.')
    if designer.is_active != active:
        designer.is_active = active
        designer.save(update_fields=['is_active'])
        record_operation(actor, designer, 'Designer reactivated.' if active else 'Designer suspended.')
    return designer
