function hasDatePassed(inputDateString: string): boolean {
    const inputDate: Date = new Date(inputDateString);
    const currentDate: Date = new Date();

    // Compare the input date with the current date
    return inputDate.getTime() < currentDate.getTime();
}

export default hasDatePassed