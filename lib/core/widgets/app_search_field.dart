import 'package:flutter/material.dart';

/// Authentic Material Design 3 Search Bar component
class AppSearchField extends StatefulWidget {
  final String hintText;
  final ValueChanged<String> onChanged;
  final VoidCallback? onClear;
  final String? initialValue;
  final String? keyString;

  const AppSearchField({
    super.key,
    this.hintText = 'Search machines...',
    required this.onChanged,
    this.onClear,
    this.initialValue,
    this.keyString,
  });

  @override
  State<AppSearchField> createState() => _AppSearchFieldState();
}

class _AppSearchFieldState extends State<AppSearchField> {
  late final TextEditingController _controller;
  bool _hasText = false;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialValue);
    _hasText = _controller.text.isNotEmpty;
    _controller.addListener(() {
      final hasTextNow = _controller.text.isNotEmpty;
      if (hasTextNow != _hasText) {
        setState(() {
          _hasText = hasTextNow;
        });
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Material(
      color: Colors.transparent,
      child: TextField(
        key: widget.keyString != null ? Key(widget.keyString!) : null,
        controller: _controller,
        onChanged: widget.onChanged,
        style: theme.textTheme.bodyMedium?.copyWith(
          color: colorScheme.onSurface,
          fontWeight: FontWeight.w500,
        ),
        decoration: InputDecoration(
          hintText: widget.hintText,
          hintStyle: theme.textTheme.bodyMedium?.copyWith(
            color: colorScheme.onSurfaceVariant.withAlpha(160),
          ),
          prefixIcon: Padding(
            padding: const EdgeInsets.only(left: 14, right: 10),
            child: Icon(
              Icons.search_rounded,
              size: 22,
              color: colorScheme.onSurfaceVariant,
            ),
          ),
          prefixIconConstraints: const BoxConstraints(minWidth: 44, minHeight: 44),
          suffixIcon: _hasText
              ? Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: IconButton(
                    icon: const Icon(Icons.clear_rounded, size: 18),
                    tooltip: 'Clear search',
                    onPressed: () {
                      _controller.clear();
                      widget.onChanged('');
                      widget.onClear?.call();
                    },
                  ),
                )
              : null,
          filled: true,
          fillColor: colorScheme.surfaceContainerLow,
          contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(28),
            borderSide: BorderSide(color: colorScheme.outlineVariant.withAlpha(140)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(28),
            borderSide: BorderSide(color: colorScheme.outlineVariant.withAlpha(140)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(28),
            borderSide: BorderSide(color: colorScheme.primary, width: 2),
          ),
        ),
      ),
    );
  }
}

