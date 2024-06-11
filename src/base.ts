export const baseHTML = (fileContent: string) => `<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Document</title>
		<link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
		<script src="https://cdn.tailwindcss.com?plugins=forms,typography,aspect-ratio,line-clamp,container-queries"></script>
		<script>
			tailwind.config = {
				theme: {
					extend: {
						fontFamily: {
							sans: ["Inter", "sans-serif"],
						},
						colors: {
							lightGreen: {
								50: "#EAF6F7",
								100: "#D5F4F5",
								200: "#2AA4A8",
								300: "#1B9296",
							},
							cyan: {
								100: "#2aa4a8",
								200: "#d9edee",
							},
							red: {
								150: "#f38c9b4d",
								250: "#f38c9b80",
								350: "#e71837",
							},
						},
						keyframes: {
							spinClock: {
								"0%": { transform: "rotate(0deg)" },
								"100%": { transform: "rotate(180deg)" },
							},
							spinAntiClock: {
								"0%": { transform: "rotate(0deg)" },
								"100%": { transform: "rotate(-180deg)" },
							},
						},
						animation: {
							spinClock: "spinClock 0.3s",
							spinAntiClock: "spinAntiClock 0.3s",
						},
					},
				},
			};
		</script>
	</head>
	<body>
		<!-- Body content -->
		${fileContent}
	</body>
</html>
`;
