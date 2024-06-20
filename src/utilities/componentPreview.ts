
export const componentPreview = (fileContent: string, tailwindConfig: string) => {
	return `<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Document</title>
		<link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
		<script src="https://cdn.tailwindcss.com?plugins=forms,typography,aspect-ratio,line-clamp,container-queries"></script>
		<script>
			${tailwindConfig}
		</script>
	</head>
	<body class="flex items-center justify-center h-screen">
		<div>
			${fileContent}
		</div>
	</body>
</html>
`;
};
