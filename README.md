# Passport Auth

This is a JavaScript library to use Passport authentication on the frontend. It provides a simple and easy-to-use API.

## Installation

```html
<script src="https://raw.githubusercontent.com/TheArchitect4855/passportauth-js/master/index.js"></script>
```

While Passport is in its alpha testing stage, there will not be minified code available.

## Usage

Handling your landing page:
```js
Passport.doLanding("/home"); // Argument is an optional redirect URL for after the user's key is retrieved
```

Authenticating a user:
```js
const passport = new Passport();
passport.load(); // Returns a promise that will be resolved when the user is authenticated
```

Logging a user out:
```js
const passport = new Passport();
passport.logout(); // Returns a promise that will be resolved once the user is logged out
```

Creating, reading, updating, and deleting user data:
```js
const passport = new Passport();
passport.add("foo", "bar") // Name, value. Value can be any JSON-serializable object.
    .then(async () => {
        console.log(await passport.get("foo")); // bar
        await passport.set("foo", "baz");
        console.log(await passport.get("foo")); // baz
        await passport.remove("foo");
        await passport.get("foo"); // throws an error
    });
```

All functions throw errors on failure.

## Support

You can contact me directly at [kurtis@kurtisknodel.com](mailto:kurtis@kurtisknodel.com).

## Contributing

Submit a pull request with your changes, as well as a detailed explanation of the changes and why you made them. Attach an issue if applicable.

## License

See [LICENSE](LICENSE).
