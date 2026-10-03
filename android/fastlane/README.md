fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## Android

### android test

```sh
[bundle exec] fastlane android test
```

Run Flutter tests

### android build

```sh
[bundle exec] fastlane android build
```

Build Flutter App Bundle (AAB) without uploading

### android build_apk

```sh
[bundle exec] fastlane android build_apk
```

Build Flutter APK without uploading

### android internal

```sh
[bundle exec] fastlane android internal
```

Build and upload to Google Play Internal track

### android closed

```sh
[bundle exec] fastlane android closed
```

Build and upload to Google Play Closed Testing track (default: alpha)

### android beta

```sh
[bundle exec] fastlane android beta
```

Build and upload to Google Play Beta track

### android production

```sh
[bundle exec] fastlane android production
```

Build and upload to Google Play Production track (supports rollout percentage)

### android promote_to_closed

```sh
[bundle exec] fastlane android promote_to_closed
```

Promote existing build from Internal track to Closed testing (alpha)

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
