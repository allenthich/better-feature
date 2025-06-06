import { betterFeature } from "@allenthich/better-feature";
import { passkey } from "@allenthich/better-feature/plugins/passkey";
import { twoFactor } from "@allenthich/better-feature/plugins";
import Database from "better-sqlite3";

export const feature = betterFeature({
	database: new Database("./db.sqlite"),
	account: {
		accountLinking: {
			enabled: true,
			trustedProviders: ["google"],
		},
	},
	emailAndPassword: {
		enabled: true,
	},
	socialProviders: {
		google: {
			clientId: import.meta.env.GOOGLE_CLIENT_ID!,
			clientSecret: import.meta.env.GOOGLE_CLIENT_SECRET!,
		},
		github: {
			clientId: import.meta.env.GITHUB_CLIENT_ID!,
			clientSecret: import.meta.env.GITHUB_CLIENT_SECRET!,
		},
	},
	plugins: [
		passkey(),
		twoFactor({
			otpOptions: {
				async sendOTP(user, otp) {
					console.log(`Sending OTP to ${user.email}: ${otp}`);
					// await resend.emails.send({
					// 	from: "Acme <no-reply@demo.better-auth.com>",
					// 	to: user.email,
					// 	subject: "Your OTP",
					// 	html: `Your OTP is ${otp}`,
					// });
				},
			},
		}),
	],
	rateLimit: {
		enabled: true,
	},
});
